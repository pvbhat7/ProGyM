<?php
    class diettimeslots{

        // Connection
        private $conn;
        
        // columns
        public $id;
        public $time_1;
        public $time_2;
        public $time_3;
        public $time_4;
        public $time_5;
        public $time_6;
        public $time_7;
        public $time_8;
        public $time_9;
        public $time_10;
        public $time_11;
        public $time_12;
        public $time_13;
        public $time_14;
        public $time_15;
        public $time_16;
        public $time_17;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }
        
        
        public function getAll(){
            $sqlQuery = "SELECT * FROM diettimeslots";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }

    }
?>

