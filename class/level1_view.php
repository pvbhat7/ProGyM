<?php
    class Level_1_profile_card{

        // Connection
        private $conn;

       
        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

         function getLevelOneProfileCardAll(){
            $sqlQuery = "select profileId,firstName,lastName,dob from customer where gender in ('male','female');";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        function getLevelOneProfileCardMale(){
            $sqlQuery = "select profileId,firstName,lastName,dob from customer where gender in ('male');";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        function getLevelOneProfileCardFemale(){
            $sqlQuery = "select profileId,firstName,lastName,dob from customer where gender in ('female');";
            echo $sqlQuery;
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
      
    }
?>

