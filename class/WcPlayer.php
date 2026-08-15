<?php
class WcPlayer {

    private $conn;
    private $db_table = "wc_players";

    public function __construct($db){
        $this->conn = $db;
    }

    // All players in a given team (squad of 26)
    public function getPlayersByTeamId($teamId){
        $sqlQuery = "SELECT id, team_id, name, position, jersey_number, discontinue
                     FROM " . $this->db_table . "
                     WHERE team_id = :tid AND discontinue = 'false'
                     ORDER BY jersey_number, id";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':tid', $teamId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt;
    }

    // Players for two teams in one call (used to populate the match prediction form)
    public function getPlayersForMatch($teamAId, $teamBId){
        $sqlQuery = "SELECT id, team_id, name, position, jersey_number
                     FROM " . $this->db_table . "
                     WHERE team_id IN (:a, :b) AND discontinue = 'false'
                     ORDER BY team_id, jersey_number, id";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':a', $teamAId, PDO::PARAM_INT);
        $stmt->bindParam(':b', $teamBId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt;
    }

    // Single player by id (used when settling matches)
    public function getPlayerById($id){
        $sqlQuery = "SELECT id, team_id, name, position, jersey_number
                     FROM " . $this->db_table . "
                     WHERE id = :id";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
?>
