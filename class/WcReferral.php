<?php
/**
 * Refer & Earn — encapsulates referral code generation, attribution
 * recording, and gold-coin crediting.
 *
 * Tables: wc_participants.referral_code, wc_participants.gold_coins, wc_referrals
 */
class WcReferral {

    // 1 gold coin per successful referral (credited on referee's first prediction).
    const COINS_PER_REFERRAL = 1;

    // Excludes ambiguous chars (0/O, 1/I/L) for easy reading / typing.
    const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const CODE_LENGTH   = 6;

    private $conn;

    public function __construct($db){
        $this->conn = $db;
    }

    // ---------- Code generation ----------

    private function randomCode(){
        $alphabet = self::CODE_ALPHABET;
        $len      = strlen($alphabet);
        $out      = '';
        for ($i = 0; $i < self::CODE_LENGTH; $i++){
            $out .= $alphabet[random_int(0, $len - 1)];
        }
        return $out;
    }

    // Assigns a unique referral_code to the given participant if they don't
    // already have one. Returns the (existing or new) code on success, false on failure.
    // Idempotent.
    public function assignCodeIfMissing($client_id){
        $client_id = (int)$client_id;
        if ($client_id <= 0) return false;

        $stmt = $this->conn->prepare(
            "SELECT referral_code FROM wc_participants WHERE client_id = :cid"
        );
        $stmt->bindParam(':cid', $client_id, PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return false; // participant row must exist first
        if (!empty($row['referral_code'])) return $row['referral_code'];

        // Try up to 20 random codes; collision probability per attempt is ~participants / 31^6 (~887M).
        for ($attempt = 0; $attempt < 20; $attempt++){
            $code = $this->randomCode();
            try {
                $upd = $this->conn->prepare(
                    "UPDATE wc_participants SET referral_code = :code
                     WHERE client_id = :cid AND (referral_code IS NULL OR referral_code = '')"
                );
                $upd->bindParam(':code', $code);
                $upd->bindParam(':cid',  $client_id, PDO::PARAM_INT);
                $upd->execute();
                if ($upd->rowCount() > 0){
                    return $code;
                }
                // Race — someone else assigned in parallel. Re-read.
                $stmt->execute();
                $row = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($row && !empty($row['referral_code'])) return $row['referral_code'];
            } catch (PDOException $e){
                // UNIQUE clash on referral_code — try a new random code
                continue;
            }
        }
        return false;
    }

    // Lookup referrer by code. Returns associative row or null.
    public function findByCode($code){
        $code = strtoupper(trim($code));
        if ($code === '') return null;
        $stmt = $this->conn->prepare(
            "SELECT client_id, referral_code FROM wc_participants WHERE referral_code = :code LIMIT 1"
        );
        $stmt->bindParam(':code', $code);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    // Records a referral AND credits the referrer in one atomic step.
    // Called at signup time — OTP verification already proved the referee's
    // phone is real, so we no longer wait for a first prediction.
    // Idempotent on referred_client_id (UNIQUE) — re-calls are no-ops.
    // Returns array('referrer_client_id', 'coins') on a fresh credit, null otherwise.
    public function recordReferralAndCredit($referrer_client_id, $referred_client_id){
        $referrer_client_id = (int)$referrer_client_id;
        $referred_client_id = (int)$referred_client_id;
        if ($referrer_client_id <= 0 || $referred_client_id <= 0) return null;
        if ($referrer_client_id === $referred_client_id) return null;

        $coins = self::COINS_PER_REFERRAL;

        try {
            $this->conn->beginTransaction();

            // Insert as already-credited. INSERT IGNORE returns 0 affected rows
            // if the referee has been referred before (UNIQUE on referred_client_id).
            $ins = $this->conn->prepare(
                "INSERT IGNORE INTO wc_referrals
                   (referrer_client_id, referred_client_id, status, coins_awarded, created_at, credited_at)
                 VALUES (:rer, :red, 'credited', :coins, NOW(), NOW())"
            );
            $ins->bindParam(':rer',   $referrer_client_id, PDO::PARAM_INT);
            $ins->bindParam(':red',   $referred_client_id, PDO::PARAM_INT);
            $ins->bindParam(':coins', $coins, PDO::PARAM_INT);
            $ins->execute();

            if ($ins->rowCount() === 0){
                $this->conn->rollBack();
                return null;
            }

            // Credit gold_coins on the referrer's participant row.
            $upd = $this->conn->prepare(
                "UPDATE wc_participants SET gold_coins = gold_coins + :coins
                 WHERE client_id = :cid"
            );
            $upd->bindParam(':coins', $coins, PDO::PARAM_INT);
            $upd->bindParam(':cid',   $referrer_client_id, PDO::PARAM_INT);
            $upd->execute();

            $this->conn->commit();
            return array(
                'referrer_client_id' => $referrer_client_id,
                'coins'              => $coins
            );
        } catch (PDOException $e){
            if ($this->conn->inTransaction()) $this->conn->rollBack();
            return null;
        }
    }

    // Credits the referrer the configured gold-coin reward, IF a pending
    // referral exists for this referee. Idempotent — running twice is a no-op.
    // Returns array(referrer_client_id, coins) when credited, null otherwise.
    public function creditOnFirstPrediction($referred_client_id){
        $referred_client_id = (int)$referred_client_id;
        if ($referred_client_id <= 0) return null;

        $stmt = $this->conn->prepare(
            "SELECT id, referrer_client_id FROM wc_referrals
             WHERE referred_client_id = :red AND status = 'pending' LIMIT 1"
        );
        $stmt->bindParam(':red', $referred_client_id, PDO::PARAM_INT);
        $stmt->execute();
        $ref = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$ref) return null;

        $referralId = (int)$ref['id'];
        $referrerId = (int)$ref['referrer_client_id'];
        $coins      = self::COINS_PER_REFERRAL;

        // Atomic state flip — only one writer wins.
        $upd = $this->conn->prepare(
            "UPDATE wc_referrals
               SET status = 'credited', credited_at = NOW(), coins_awarded = :coins
             WHERE id = :id AND status = 'pending'"
        );
        $upd->bindParam(':coins', $coins, PDO::PARAM_INT);
        $upd->bindParam(':id',    $referralId, PDO::PARAM_INT);
        $upd->execute();
        if ($upd->rowCount() === 0) return null; // someone else just credited

        // Credit gold_coins on the referrer's participant row.
        $cred = $this->conn->prepare(
            "UPDATE wc_participants SET gold_coins = gold_coins + :coins
             WHERE client_id = :cid"
        );
        $cred->bindParam(':coins', $coins, PDO::PARAM_INT);
        $cred->bindParam(':cid',   $referrerId, PDO::PARAM_INT);
        $cred->execute();

        return array(
            'referrer_client_id' => $referrerId,
            'coins'              => $coins
        );
    }

    // Returns the referral record for a referee (if any).
    public function getByReferred($referred_client_id){
        $stmt = $this->conn->prepare(
            "SELECT * FROM wc_referrals WHERE referred_client_id = :red LIMIT 1"
        );
        $stmt->bindParam(':red', $referred_client_id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    // List the people a given user has referred, newest first. Includes name + status.
    public function listForReferrer($referrer_client_id){
        $stmt = $this->conn->prepare(
            "SELECT r.referred_client_id, r.status, r.coins_awarded,
                    r.created_at, r.credited_at,
                    c.name AS referred_name
             FROM wc_referrals r
             LEFT JOIN client c ON c.id = r.referred_client_id
             WHERE r.referrer_client_id = :rer
             ORDER BY r.created_at DESC"
        );
        $stmt->bindParam(':rer', $referrer_client_id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Referral ranking leaderboard.
    // Order: gold_coins desc, then earliest first credited referral as a tiebreaker.
    // Only participants with gold_coins > 0 are listed.
    public function getRanking($limit){
        $limit = max(1, min(500, (int)$limit));
        $sql = "SELECT wp.client_id, wp.gold_coins, wp.referral_code,
                       c.name AS client_name, c.photo AS client_photo,
                       (SELECT COUNT(*) FROM wc_referrals r
                          WHERE r.referrer_client_id = wp.client_id AND r.status = 'credited') AS referrals_count,
                       (SELECT MIN(r.credited_at) FROM wc_referrals r
                          WHERE r.referrer_client_id = wp.client_id AND r.status = 'credited') AS first_credited_at
                FROM wc_participants wp
                LEFT JOIN client c ON c.id = wp.client_id
                WHERE wp.gold_coins > 0
                ORDER BY wp.gold_coins DESC,
                         first_credited_at ASC
                LIMIT :lim";
        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt;
    }
}
?>
