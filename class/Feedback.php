<?php
    class Feedback{

        // Connection
        private $conn;

        // Table
        private $db_table = "Feedback";

        // Columns
        	public $id;
        	public $clientId;
        	public $name;
        	public $email;
        	public $mobile;
        	public $feedback;
        	public $actionTaken;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

        
        // CREATE
        public function create(){

            $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                        clientId = '".$this->clientId."',
						name = '".$this->name."',
						email = '".$this->email."',
						mobile = '".$this->mobile."',
						feedback = '".$this->feedback."'";
						
	        $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            
        }
      
    }
?>

