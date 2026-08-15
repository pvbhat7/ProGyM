<?php
class WcParticipant {

    private $conn;
    private $db_table = "wc_participants";

    public function __construct($db){
        $this->conn = $db;
    }

    // Register a client as a campaign participant. Idempotent — re-calling for the
    // same client_id is a no-op thanks to UNIQUE KEY (client_id).
    public function registerParticipant($client_id, $source, $was_gym_client_at_join){
        $sqlQuery = "INSERT IGNORE INTO " . $this->db_table . "
                     (client_id, joined_at, source, was_gym_client_at_join, status)
                     VALUES (:cid, NOW(), :src, :wgc, 'active')";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':cid', $client_id, PDO::PARAM_INT);
        $stmt->bindParam(':src', $source);
        $stmt->bindParam(':wgc', $was_gym_client_at_join);
        return $stmt->execute();
    }

    public function getByClientId($client_id){
        $sqlQuery = "SELECT * FROM " . $this->db_table . "
                     WHERE client_id = :cid";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':cid', $client_id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    public function existsByClientId($client_id){
        $sqlQuery = "SELECT COUNT(*) FROM " . $this->db_table . "
                     WHERE client_id = :cid";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':cid', $client_id, PDO::PARAM_INT);
        $stmt->execute();
        return ((int)$stmt->fetchColumn()) > 0;
    }

    // Increment denormalized stats — called by the settle-match logic per affected user.
    public function incrementStats($client_id, $coins_to_add, $matches_predicted_increment){
        $sqlQuery = "UPDATE " . $this->db_table . "
                     SET total_coins_earned      = total_coins_earned + :coins,
                         total_matches_predicted = total_matches_predicted + :mp
                     WHERE client_id = :cid";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':cid',   $client_id,                   PDO::PARAM_INT);
        $stmt->bindParam(':coins', $coins_to_add);
        $stmt->bindParam(':mp',    $matches_predicted_increment, PDO::PARAM_INT);
        return $stmt->execute();
    }

    // Called when a non-member buys a gym package, to mark the conversion timestamp
    // (only if not already converted). Used for conversion-rate reporting.
    public function markConvertedToMember($client_id){
        $sqlQuery = "UPDATE " . $this->db_table . "
                     SET converted_to_member_at = NOW()
                     WHERE client_id = :cid
                       AND was_gym_client_at_join = 'no'
                       AND converted_to_member_at IS NULL";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':cid', $client_id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    // Overall leaderboard.
    // Ranking rules (applied in strict order):
    //   1. Highest total_coins_earned wins
    //   2. Lowest sum of daily_rank across all snapshot days wins (consistency)
    //   3. More days finishing in top 3 wins
    //   4. Earliest first prediction (wc_predictions.submitted_at) wins (engagement)
    // Tie-breakers 2 & 3 read from wc_daily_leaderboard_snapshot, populated by
    // snapshotDailyLeaderboard() after every match settlement.
    public function getOverallLeaderboard($limit){
        $sqlQuery = "SELECT wp.client_id, wp.total_coins_earned, wp.total_matches_predicted,
                            wp.was_gym_client_at_join, wp.joined_at,
                            c.name AS client_name, c.photo AS client_photo,
                            COALESCE(pc.predictions_placed, 0) AS predictions_placed,
                            COALESCE(rs.rank_sum, 999999)     AS rank_sum,
                            COALESCE(rs.top3_days, 0)         AS top3_days,
                            fp.first_prediction_at            AS first_prediction_at
                     FROM " . $this->db_table . " wp
                     LEFT JOIN client c ON c.id = wp.client_id
                     LEFT JOIN (
                         SELECT client_id, COUNT(*) AS predictions_placed
                         FROM wc_predictions
                         GROUP BY client_id
                     ) pc ON pc.client_id = wp.client_id
                     LEFT JOIN (
                         SELECT client_id,
                                SUM(daily_rank) AS rank_sum,
                                SUM(CASE WHEN daily_rank <= 3 THEN 1 ELSE 0 END) AS top3_days
                         FROM wc_daily_leaderboard_snapshot
                         GROUP BY client_id
                     ) rs ON rs.client_id = wp.client_id
                     LEFT JOIN (
                         SELECT client_id, MIN(submitted_at) AS first_prediction_at
                         FROM wc_predictions
                         GROUP BY client_id
                     ) fp ON fp.client_id = wp.client_id
                     WHERE wp.status = 'active'
                     ORDER BY wp.total_coins_earned DESC,
                              rank_sum ASC,
                              top3_days DESC,
                              first_prediction_at IS NULL, first_prediction_at ASC,
                              wp.joined_at ASC
                     LIMIT :lim";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt;
    }

    // Same as getOverallLeaderboard but also returns client mobile.
    // Kept as a separate method so the public-facing leaderboard endpoint never leaks contact info.
    public function getOverallLeaderboardWithContact($limit){
        $sqlQuery = "SELECT wp.client_id, wp.referral_code, wp.total_coins_earned, wp.total_matches_predicted,
                            wp.was_gym_client_at_join, wp.joined_at,
                            wp.sms_reminder_sent_at, wp.whatsapp_reminder_sent_at,
                            wp.match_reminder_sms_sent_at, wp.match_reminder_whatsapp_sent_at,
                            c.name AS client_name, c.photo AS client_photo, c.mobile AS client_mobile,
                            COALESCE(pc.predictions_placed, 0) AS predictions_placed,
                            COALESCE(rs.rank_sum, 999999)     AS rank_sum,
                            COALESCE(rs.top3_days, 0)         AS top3_days,
                            fp.first_prediction_at            AS first_prediction_at
                     FROM " . $this->db_table . " wp
                     LEFT JOIN client c ON c.id = wp.client_id
                     LEFT JOIN (
                         SELECT client_id, COUNT(*) AS predictions_placed
                         FROM wc_predictions
                         GROUP BY client_id
                     ) pc ON pc.client_id = wp.client_id
                     LEFT JOIN (
                         SELECT client_id,
                                SUM(daily_rank) AS rank_sum,
                                SUM(CASE WHEN daily_rank <= 3 THEN 1 ELSE 0 END) AS top3_days
                         FROM wc_daily_leaderboard_snapshot
                         GROUP BY client_id
                     ) rs ON rs.client_id = wp.client_id
                     LEFT JOIN (
                         SELECT client_id, MIN(submitted_at) AS first_prediction_at
                         FROM wc_predictions
                         GROUP BY client_id
                     ) fp ON fp.client_id = wp.client_id
                     WHERE wp.status = 'active'
                     ORDER BY wp.total_coins_earned DESC,
                              rank_sum ASC,
                              top3_days DESC,
                              first_prediction_at IS NULL, first_prediction_at ASC,
                              wp.joined_at ASC
                     LIMIT :lim";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt;
    }

    // Snapshot the end-of-day leaderboard for $dateYmd (YYYY-MM-DD).
    // For every active participant, writes one row to wc_daily_leaderboard_snapshot
    // with their cumulative footballs and their rank position for that day.
    // Standard competition ranking — ties share the same rank (e.g. 1,2,2,4).
    // Idempotent: re-running for the same date overwrites prior rows for that date.
    // Called from match-settlement paths after a match is finalized.
    public function snapshotDailyLeaderboard($dateYmd){
        // Pull every active participant in score order (single read).
        $sel = "SELECT client_id, total_coins_earned
                FROM " . $this->db_table . "
                WHERE status = 'active'
                ORDER BY total_coins_earned DESC";
        $stmt = $this->conn->prepare($sel);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($rows)) return true;

        // Assign standard competition rank — equal scores share the same rank.
        $ranked = array();
        $prevScore = null;
        $prevRank  = 0;
        $i = 0;
        foreach ($rows as $r){
            $i++;
            $score = (float)$r['total_coins_earned'];
            if ($prevScore === null || $score !== $prevScore){
                $prevRank  = $i;
                $prevScore = $score;
            }
            $ranked[] = array(
                'client_id' => (int)$r['client_id'],
                'score'     => $score,
                'rank'      => $prevRank,
            );
        }

        // Upsert one row per participant for $dateYmd.
        $ins = "INSERT INTO wc_daily_leaderboard_snapshot
                  (client_id, snapshot_date, footballs_total, daily_rank)
                VALUES (:cid, :d, :ft, :dr)
                ON DUPLICATE KEY UPDATE
                  footballs_total = VALUES(footballs_total),
                  daily_rank      = VALUES(daily_rank)";
        $up = $this->conn->prepare($ins);
        foreach ($ranked as $r){
            $up->bindValue(':cid', $r['client_id'], PDO::PARAM_INT);
            $up->bindValue(':d',   $dateYmd);
            $up->bindValue(':ft',  $r['score']);
            $up->bindValue(':dr',  $r['rank'], PDO::PARAM_INT);
            $up->execute();
        }
        return true;
    }

    // Daily leaderboard: coins earned only from matches settled on a given day.
    // Computed live from wc_predictions because daily totals are not denormalized.
    public function getDailyLeaderboard($dateYmd, $limit){
        $sqlQuery = "SELECT p.client_id,
                            SUM(p.coins_awarded) AS coins_today,
                            COUNT(*) AS matches_predicted_today,
                            c.name  AS client_name,
                            c.photo AS client_photo
                     FROM wc_predictions p
                     JOIN wc_matches m ON m.id = p.match_id
                     LEFT JOIN client c ON c.id = p.client_id
                     WHERE p.is_settled = 'yes'
                       AND DATE(m.settled_at) = :d
                     GROUP BY p.client_id
                     ORDER BY coins_today DESC, matches_predicted_today DESC
                     LIMIT :lim";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':d',   $dateYmd);
        $stmt->bindParam(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt;
    }

    // Stamp the reminder-sent timestamp for the given channel.
    // $channel one of: 'sms', 'whatsapp' (referral) | 'match_sms', 'match_whatsapp' (match reminder).
    // Returns false if the channel is invalid.
    public function markReminderSent($client_id, $channel){
        $map = array(
            'sms'            => 'sms_reminder_sent_at',
            'whatsapp'       => 'whatsapp_reminder_sent_at',
            'match_sms'      => 'match_reminder_sms_sent_at',
            'match_whatsapp' => 'match_reminder_whatsapp_sent_at',
        );
        if (!isset($map[$channel])) return false;
        $col = $map[$channel];
        $sqlQuery = "UPDATE " . $this->db_table . "
                     SET $col = NOW()
                     WHERE client_id = :cid";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':cid', $client_id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    // Wipe per-match reminder timestamps for everyone — called by the settle path so
    // the next upcoming match starts with a fresh pending list.
    public function resetMatchReminders(){
        $sqlQuery = "UPDATE " . $this->db_table . "
                     SET match_reminder_sms_sent_at      = NULL,
                         match_reminder_whatsapp_sent_at = NULL";
        $stmt = $this->conn->prepare($sqlQuery);
        return $stmt->execute();
    }

    // Aggregate stats for admin reporting (top of dashboard)
    public function getCampaignSummary(){
        $sqlQuery = "SELECT
                       COUNT(*) AS total_participants,
                       SUM(CASE WHEN was_gym_client_at_join = 'no'  THEN 1 ELSE 0 END) AS non_member_signups,
                       SUM(CASE WHEN was_gym_client_at_join = 'yes' THEN 1 ELSE 0 END) AS member_signups,
                       SUM(CASE WHEN converted_to_member_at IS NOT NULL THEN 1 ELSE 0 END) AS converted_count,
                       SUM(total_coins_earned) AS total_coins_distributed
                     FROM " . $this->db_table . "
                     WHERE status = 'active'";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
?>
