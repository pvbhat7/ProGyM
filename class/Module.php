<?php
    class Module{

        // Connection
        private $conn;

        // Table
        private $db_table = "Module";

        // Columns
        	public $id;
			public $mac;
			public $email;			
			public $sms;
			public $diet;
			public $workout;
			public $monthlyData;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }
        
        public function checkIfExistByMac(){
            $sqlQuery = "SELECT * FROM Module where mac = '".$this -> mac."' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            $itemCount = $stmt->rowCount();
            return $itemCount;
        }

        // GET 
        public function getByMac(){
            
            
            $count = $this -> checkIfExistByMac();
            if($count == 0)
            {   
                $validateKeyQuery = "select * from license_data where mac = '".$this -> mac."' and discontinue = 'false' ";   
                $validateKeyQuery_st = $this->conn->prepare($validateKeyQuery);
                $validateKeyQuery_st->execute();
                $validateKeyQuery_count = $validateKeyQuery_st->rowCount();
                
                if($validateKeyQuery_count > 0)
                {
                         $curPkg_row = $validateKeyQuery_st->fetch(PDO::FETCH_ASSOC);
                        if($curPkg_row['pkg'] == 'Bronze Package')
                        {
                             $insert_query = "INSERT INTO `Module` (`mac`, `email`, `sms`, `diet`, `workout`, `monthlyData`) 
                            VALUES ('".$this -> mac."', 'TRUE', 'TRUE', 'FALSE', 'FALSE', 'FALSE')";
                            $insert_query_st = $this->conn->prepare($insert_query);
                            $insert_query_st->execute();
                        }
                        else
                        {
                            $insert_query = "INSERT INTO `Module` (`mac`, `email`, `sms`, `diet`, `workout`, `monthlyData`) 
                            VALUES ('".$this -> mac."', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'TRUE')";
                            $insert_query_st = $this->conn->prepare($insert_query);
                            $insert_query_st->execute();
                        }
                }
                else
                {
                    $insert_query = "INSERT INTO `Module` (`mac`, `email`, `sms`, `diet`, `workout`, `monthlyData`) 
                    VALUES ('".$this -> mac."', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'FALSE')";
                    $insert_query_st = $this->conn->prepare($insert_query);
                    $insert_query_st->execute();    
                }
            
                
            }
            
            $sqlQuery = "SELECT * FROM Module where mac = '".$this -> mac."' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        public function updateEmail(){
            $sqlQuery = "update Module set email = '".$this-> email."' where mac = '".$this -> mac."' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
        }
        
        public function updateSms(){
            $sqlQuery = "update Module set sms = '".$this-> sms."' where mac = '".$this -> mac."' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
        }

    }
?>

