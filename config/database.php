<?php 
    class Database {
        //private $host = "151.106.116.1";
        private $host = "localhost";
        private $database_name = "u636480992_ggs";
        private $username = "u636480992_ggs";
        private $password = "##Ppp7771";

        public $conn;

        public function getConnection(){
            $this->conn = null;
            try{
                $this->conn = new PDO("mysql:host=" . $this->host . ";dbname=" . $this->database_name, $this->username, $this->password);
                $this->conn->exec("set names utf8");
                // Asia/Calcutta (IST). Makes MySQL NOW()/CURDATE() return IST so
                // server-side timestamps (wc_predictions.submitted_at etc.) match
                // the d/m/Y IST convention used everywhere else in the codebase.
                $this->conn->exec("SET time_zone = '+05:30'");
            }catch(PDOException $exception){
                echo "Database could not be connected: " . $exception->getMessage();
            }
            return $this->conn;
        }
    }  
?>