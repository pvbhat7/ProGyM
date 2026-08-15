<?php
// Knockout Bonanza — permanent self-elimination.
// A client can choose "Leave Tournament" from the leaderboard. Once eliminated
// they are permanently barred from submitting predictions or a tiebreaker, and
// their existing predictions / tiebreaker are soft-deleted so they no longer
// appear on the leaderboard. There is intentionally no rejoin API.

class WcSpecialElimination {
    private $conn;

    public function __construct($db){
        $this->conn = $db;
    }

    public function isEliminated($client_id){
        $client_id = (int)$client_id;
        if ($client_id <= 0) return false;
        $st = $this->conn->prepare("SELECT 1 FROM wc_special_eliminated WHERE client_id = :cid LIMIT 1");
        $st->bindValue(':cid', $client_id, PDO::PARAM_INT);
        $st->execute();
        return (bool)$st->fetchColumn();
    }

    // Marks the client as permanently eliminated and soft-deletes their existing
    // predictions and tiebreaker so they drop off the leaderboard. Idempotent —
    // calling twice on an already-eliminated user returns ok with no changes.
    public function markEliminated($client_id){
        $client_id = (int)$client_id;
        if ($client_id <= 0) return ['ok' => false, 'error' => 'client_id required'];

        // Verify client exists
        $chk = $this->conn->prepare("SELECT id FROM client WHERE id = :cid");
        $chk->bindValue(':cid', $client_id, PDO::PARAM_INT);
        $chk->execute();
        if (!$chk->fetchColumn()) return ['ok' => false, 'error' => 'client not found'];

        $ins = $this->conn->prepare("INSERT IGNORE INTO wc_special_eliminated (client_id, left_at) VALUES (:cid, NOW())");
        $ins->bindValue(':cid', $client_id, PDO::PARAM_INT);
        $ins->execute();

        $up1 = $this->conn->prepare("UPDATE wc_special_predictions SET discontinue = 'true', updated_at = NOW() WHERE client_id = :cid");
        $up1->bindValue(':cid', $client_id, PDO::PARAM_INT);
        $up1->execute();

        $up2 = $this->conn->prepare("UPDATE wc_special_tiebreaker SET discontinue = 'true', updated_at = NOW() WHERE client_id = :cid");
        $up2->bindValue(':cid', $client_id, PDO::PARAM_INT);
        $up2->execute();

        return ['ok' => true];
    }
}
?>
