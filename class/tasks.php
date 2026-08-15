<?php
    class tasks{

        // Connection
        private $conn;

        // Table
        private $db_table = "tasks";

        // Columns
        	public $id;
			public $name;
			public $img;
			public $timing;			
			public $description;
			public $date;
			public $submitStatus;
			public $submitTimeStamp;
			public $submitImg;
			public $isApproved;
			public $points;
			

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

       
        // CREATE
        public function create(){
            $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                        name = '".$this->name."',
						mobile = '".$this->img."',
						email = '".$this->timing."',
						updateDate = '".$this->status."',
						description = '".$this->description."',
						status = 'new',
						trainer ='".$this->trainer."',
						submitImg = ='".$this->submitImg."', 
						discontinue = 'false'";

	    $stmt = $this->conn->prepare($sqlQuery);
        
           
           $stmt->execute();
        $lastInsertedId = $this->conn->lastInsertId();
        return  $lastInsertedId;		
			
        }
		
		// UPDATE
        public function update(){
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
                        name = '".$this->name."',
						mobile = '".$this->img."',
						email = '".$this->timing."',
						updateDate = '".$this->status."',
						description = '".$this->description."',
						status = '".$this->description."',
						trainer ='".$this->trainer."',
						submitImg = ='".$this->submitImg."', 
						discontinue = '".$this->discontinue."'
                    WHERE 
                        id =".$this->id."";
						
        
            $stmt = $this->conn->prepare($sqlQuery);
        
            if($stmt->execute()){
               return true;
            }
            return false;
        }

    
        
        // ALL
        public function getAllByDate(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where date = '".$this -> date."' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }   
        
        public function getTodaysTask(){
            $d = Date('d/m/Y');
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where date = '".$d."' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }   
        
        public function updateStatusToServer(){
            date_default_timezone_set('Asia/Calcutta');
            $tmp = date("d-m-Y h:i:s");
            $sqlQuery = "update tasks set isApproved = 'yes' , points = 10 ,   submitStatus = 'yes' , submitTimestamp = '".$tmp."' where id = ".$this -> id." ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 
        
        public function updateSubmitStatusImg(){
            $sqlQuery = "update tasks set submitImg = '".$this -> submitImg."'  where id = ".$this -> id." ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 
        
        public function getAllPoints(){
            $sqlQuery = " SELECT date , sum(points) as points FROM `tasks` group by date order by id desc;";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }  
        
        
       

        
    }
?>

