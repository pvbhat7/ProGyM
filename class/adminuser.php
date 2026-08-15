<?php
    class Adminuser{

        // Connection
        private $conn;
        
        // columns
        public $id;
        public $authorizedToApprovePayment;
        public $name;
        public $username;
        public $password;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }
        
        
        public function validate(){
            $sqlQuery = "SELECT * FROM admin_user where username = '".$this -> username."' and password = '".$this -> password."' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        public function fixProfile()
        {
             $sqlQuery = "update `workoutscheduleobject` set mtid = 280 where mtid = '' or mtid is null";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        
        }
        
        

    }
?>

