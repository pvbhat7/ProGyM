<?php
class WcMatch {

    private $conn;
    private $db_table = "wc_matches";

    public function __construct($db){
        $this->conn = $db;
    }

    // Today's remaining upcoming matches (IST calendar day). Used by the admin "match reminder" message.
    public function getTodayUpcomingMatches(){
        $sqlQuery = "SELECT m.id, m.team_a_id, m.team_b_id, m.team_a_label, m.team_b_label, m.stage, m.multiplier,
                            m.kickoff_at, m.status,
                            ta.name AS team_a_name, ta.short_code AS team_a_code, ta.flag AS team_a_flag, ta.group_name AS team_a_group,
                            tb.name AS team_b_name, tb.short_code AS team_b_code, tb.flag AS team_b_flag, tb.group_name AS team_b_group
                     FROM " . $this->db_table . " m
                     LEFT JOIN wc_teams ta ON ta.id = m.team_a_id
                     LEFT JOIN wc_teams tb ON tb.id = m.team_b_id
                     WHERE m.discontinue = 'false'
                       AND m.status = 'upcoming'
                       AND m.kickoff_at > NOW()
                       AND DATE(m.kickoff_at) = CURDATE()
                     ORDER BY m.kickoff_at ASC";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->execute();
        return $stmt;
    }

    // Upcoming matches: not settled, kickoff in the future, with team names joined for display.
    public function getUpcomingMatches(){
        $sqlQuery = "SELECT m.id, m.team_a_id, m.team_b_id, m.team_a_label, m.team_b_label, m.stage, m.multiplier,
                            m.kickoff_at, m.status,
                            ta.name AS team_a_name, ta.short_code AS team_a_code, ta.flag AS team_a_flag, ta.group_name AS team_a_group,
                            tb.name AS team_b_name, tb.short_code AS team_b_code, tb.flag AS team_b_flag, tb.group_name AS team_b_group
                     FROM " . $this->db_table . " m
                     LEFT JOIN wc_teams ta ON ta.id = m.team_a_id
                     LEFT JOIN wc_teams tb ON tb.id = m.team_b_id
                     WHERE m.discontinue = 'false'
                       AND m.status = 'upcoming'
                       AND m.kickoff_at > NOW()
                       AND m.kickoff_at >= '2026-06-17 00:00:00'
                     ORDER BY m.kickoff_at ASC";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->execute();
        return $stmt;
    }

    // Past matches (settled), most recent first
    public function getPastMatches(){
        $sqlQuery = "SELECT m.id, m.team_a_id, m.team_b_id, m.team_a_label, m.team_b_label, m.stage, m.multiplier,
                            m.kickoff_at, m.status, m.winner, m.score_a, m.score_b,
                            m.first_scorer_id, m.motm_id, m.total_goals_range,
                            m.both_teams_scored, m.settled_at,
                            ta.name AS team_a_name, ta.short_code AS team_a_code, ta.flag AS team_a_flag, ta.group_name AS team_a_group,
                            tb.name AS team_b_name, tb.short_code AS team_b_code, tb.flag AS team_b_flag, tb.group_name AS team_b_group,
                            sp.name AS first_scorer_name,
                            mp.name AS motm_name
                     FROM " . $this->db_table . " m
                     LEFT JOIN wc_teams ta   ON ta.id = m.team_a_id
                     LEFT JOIN wc_teams tb   ON tb.id = m.team_b_id
                     LEFT JOIN wc_players sp ON sp.id = m.first_scorer_id
                     LEFT JOIN wc_players mp ON mp.id = m.motm_id
                     WHERE m.discontinue = 'false'
                       AND m.status = 'settled'
                       AND m.kickoff_at >= '2026-06-17 00:00:00'
                     ORDER BY m.kickoff_at DESC";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->execute();
        return $stmt;
    }

    // All matches for admin (any status), most recent first
    public function getAllMatches(){
        $sqlQuery = "SELECT m.id, m.team_a_id, m.team_b_id, m.stage, m.multiplier,
                            m.kickoff_at, m.status, m.winner, m.score_a, m.score_b,
                            m.first_scorer_id, m.motm_id,
                            m.settled_at, m.result_source,
                            ta.name AS team_a_name, ta.short_code AS team_a_code,
                            tb.name AS team_b_name, tb.short_code AS team_b_code,
                            sp.name AS first_scorer_name,
                            mp.name AS motm_name
                     FROM " . $this->db_table . " m
                     LEFT JOIN wc_teams   ta ON ta.id = m.team_a_id
                     LEFT JOIN wc_teams   tb ON tb.id = m.team_b_id
                     LEFT JOIN wc_players sp ON sp.id = m.first_scorer_id
                     LEFT JOIN wc_players mp ON mp.id = m.motm_id
                     WHERE m.discontinue = 'false'
                     ORDER BY m.kickoff_at DESC";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->execute();
        return $stmt;
    }

    // Single match by id, with team names and player names
    public function getMatchById($id){
        $sqlQuery = "SELECT m.id, m.team_a_id, m.team_b_id, m.team_a_label, m.team_b_label, m.stage, m.multiplier,
                            m.kickoff_at, m.status, m.winner, m.score_a, m.score_b,
                            m.first_scorer_id, m.motm_id, m.total_goals_range,
                            m.both_teams_scored, m.settled_at,
                            ta.name AS team_a_name, ta.short_code AS team_a_code, ta.flag AS team_a_flag, ta.group_name AS team_a_group,
                            tb.name AS team_b_name, tb.short_code AS team_b_code, tb.flag AS team_b_flag, tb.group_name AS team_b_group,
                            sp.name AS first_scorer_name,
                            mp.name AS motm_name
                     FROM " . $this->db_table . " m
                     LEFT JOIN wc_teams ta   ON ta.id = m.team_a_id
                     LEFT JOIN wc_teams tb   ON tb.id = m.team_b_id
                     LEFT JOIN wc_players sp ON sp.id = m.first_scorer_id
                     LEFT JOIN wc_players mp ON mp.id = m.motm_id
                     WHERE m.id = :id";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Admin: create a new match. Returns the inserted row id on success, false otherwise.
    public function createMatch($team_a_id, $team_b_id, $stage, $multiplier, $kickoff_at){
        $sqlQuery = "INSERT INTO " . $this->db_table . "
                     (team_a_id, team_b_id, stage, multiplier, kickoff_at, status, discontinue)
                     VALUES (:a, :b, :stage, :mult, :kickoff, 'upcoming', 'false')";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':a',       $team_a_id,  PDO::PARAM_INT);
        $stmt->bindParam(':b',       $team_b_id,  PDO::PARAM_INT);
        $stmt->bindParam(':stage',   $stage);
        $stmt->bindParam(':mult',    $multiplier);
        $stmt->bindParam(':kickoff', $kickoff_at);
        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }
        return false;
    }

    // Admin: update an unsettled match (teams, stage, multiplier, kickoff time)
    public function updateMatch($id, $team_a_id, $team_b_id, $stage, $multiplier, $kickoff_at){
        $sqlQuery = "UPDATE " . $this->db_table . "
                     SET team_a_id = :a,
                         team_b_id = :b,
                         stage     = :stage,
                         multiplier= :mult,
                         kickoff_at= :kickoff
                     WHERE id = :id AND status <> 'settled'";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':id',      $id,         PDO::PARAM_INT);
        $stmt->bindParam(':a',       $team_a_id,  PDO::PARAM_INT);
        $stmt->bindParam(':b',       $team_b_id,  PDO::PARAM_INT);
        $stmt->bindParam(':stage',   $stage);
        $stmt->bindParam(':mult',    $multiplier);
        $stmt->bindParam(':kickoff', $kickoff_at);
        return $stmt->execute();
    }

    // Admin: write the result fields and flip status to 'settled'.
    // The actual prediction settling + coin awarding happens in WcPrediction::settleAllForMatch().
    public function markMatchSettled($id, $winner, $score_a, $score_b, $first_scorer_id, $motm_id, $total_goals_range, $both_teams_scored){
        $sqlQuery = "UPDATE " . $this->db_table . "
                     SET status            = 'settled',
                         winner            = :winner,
                         score_a           = :sa,
                         score_b           = :sb,
                         first_scorer_id   = :fs,
                         motm_id           = :motm,
                         total_goals_range = :tgr,
                         both_teams_scored = :bts,
                         settled_at        = NOW()
                     WHERE id = :id AND status <> 'settled'";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':id',     $id,                PDO::PARAM_INT);
        $stmt->bindParam(':winner', $winner);
        $stmt->bindParam(':sa',     $score_a,           PDO::PARAM_INT);
        $stmt->bindParam(':sb',     $score_b,           PDO::PARAM_INT);
        $stmt->bindParam(':fs',     $first_scorer_id,   PDO::PARAM_INT);
        $stmt->bindParam(':motm',   $motm_id,           PDO::PARAM_INT);
        $stmt->bindParam(':tgr',    $total_goals_range);
        $stmt->bindParam(':bts',    $both_teams_scored);
        return $stmt->execute();
    }

    // Admin: soft-delete a match (sets discontinue='true'). Blocked if already settled.
    public function softDeleteMatch($id){
        $sqlQuery = "UPDATE " . $this->db_table . "
                     SET discontinue = 'true'
                     WHERE id = :id AND status <> 'settled'";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        return $stmt->execute();
    }

    // Returns matches starting in the next N minutes (used by FCM kickoff reminder cron)
    public function getMatchesStartingWithinMinutes($minutes){
        $sqlQuery = "SELECT m.id, m.team_a_id, m.team_b_id, m.kickoff_at,
                            ta.name AS team_a_name, tb.name AS team_b_name
                     FROM " . $this->db_table . " m
                     LEFT JOIN wc_teams ta ON ta.id = m.team_a_id
                     LEFT JOIN wc_teams tb ON tb.id = m.team_b_id
                     WHERE m.discontinue = 'false'
                       AND m.status = 'upcoming'
                       AND m.kickoff_at > NOW()
                       AND m.kickoff_at <= DATE_ADD(NOW(), INTERVAL :mins MINUTE)
                     ORDER BY m.kickoff_at ASC";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':mins', $minutes, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt;
    }
}
?>
