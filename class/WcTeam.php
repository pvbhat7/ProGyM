<?php
class WcTeam {

    private $conn;
    private $db_table = "wc_teams";

    public function __construct($db){
        $this->conn = $db;
    }

    // All active teams (48 expected). Ordered by group, then id (so each group's teams stay together).
    public function getAllTeams(){
        $sqlQuery = "SELECT id, name, short_code, group_name, flag, discontinue
                     FROM " . $this->db_table . "
                     WHERE discontinue = 'false'
                     ORDER BY group_name, id";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->execute();
        return $stmt;
    }

    // Single team by id
    public function getTeamById($id){
        $sqlQuery = "SELECT id, name, short_code, group_name, flag, discontinue
                     FROM " . $this->db_table . "
                     WHERE id = :id";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // All teams in a given group (A-L)
    public function getTeamsByGroup($group){
        $sqlQuery = "SELECT id, name, short_code, group_name, flag, discontinue
                     FROM " . $this->db_table . "
                     WHERE group_name = :grp AND discontinue = 'false'
                     ORDER BY id";
        $stmt = $this->conn->prepare($sqlQuery);
        $stmt->bindParam(':grp', $group);
        $stmt->execute();
        return $stmt;
    }
}
?>
