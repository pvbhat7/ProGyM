<?php
    class t_workoutsubtype{

        // Connection
        private $conn;

        // Table
        private $db_table = "t_workoutsubtype";

        // Columns
        	public $id;
			public $name;
			public $discontinue;
			public $mtid;			
			public $gifFilePath;
			public $sets;
			public $reps;
			public $muscle;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

        // GET ALL
        public function getClient(){
            $sqlQuery = "SELECT id, name, email, age, designation, created FROM " . $this->db_table . "";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }

        // CREATE
        public function createSubWorkoutType(){
            $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                        name = '".$this->name."',
						discontinue = '".$this->discontinue."',
						mtid = '".$this->mtid."',
						gifFilePath = '".$this->gifFilePath."',
						sets = '".$this->sets."',
						reps = '".$this->reps."',
						muscle = '".$this->muscle."'";

	    $stmt = $this->conn->prepare($sqlQuery);
        
           
            if($stmt->execute()){
               return true;
            }
            return false;
			
			//return $stmt->debugDumpParams();
			
        }

        // UPDATE
        public function getSubWorkoutTypeById(){
            $sqlQuery = "SELECT
						id,
                        name,
						mtid,
						discontinue,
						gifFilePath,
						sets,
						reps
		 
                      FROM
                        ". $this->db_table ."
                    WHERE 
                       id = ?
                    LIMIT 0,1";

            $stmt = $this->conn->prepare($sqlQuery);

            $stmt->bindParam(1, $this->id);
            

            $stmt->execute();

            $dataRow = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $this->name= $dataRow['name'];
			$this->mtid= $dataRow['mtid'];
			$this->discontinue= $dataRow['discontinue'];
			$this->gifFilePath= $dataRow['gifFilePath'];
			$this->sets= $dataRow['sets'];
			$this->reps= $dataRow['reps'];
        }        

        // UPDATE
        public function updateSubWorkoutType(){
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
                        name = '".$this->name."',
						mtid = '".$this->mtid."',
						gifFilePath = '".$this->gifFilePath."',
						sets = '".$this->sets."',
						reps = '".$this->reps."',
						muscle = '".$this->muscle."',
						discontinue = '".$this->discontinue."'
                    WHERE
                        id =".$this->id."";
						
        
            $stmt = $this->conn->prepare($sqlQuery);
        
            if($stmt->execute()){
               return true;
            }
            return false;
        }

        // DELETE
        function deleteClient(){
            $sqlQuery = "DELETE FROM " . $this->db_table . " WHERE id = ?";
            $stmt = $this->conn->prepare($sqlQuery);
        
            $this->id=htmlspecialchars(strip_tags($this->id));
        
            $stmt->bindParam(1, $this->id);
        
            if($stmt->execute()){
                return true;
            }
            return false;
        }
		
		function getAllClientExternalCodes()
		{
			$sqlQuery = "SELECT externalCode FROM " . $this->db_table . "";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
		}
		
		function getAllByMainTypeId()
		{
			$sqlQuery = "SELECT * FROM " . $this->db_table . " where mtid = ".$this -> mtid." ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
		}
		
		public function getAll(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " WHERE discontinue = 'false' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 
        
        public function getAllDistinct(){
            $sqlQuery = "SELECT DISTINCT name , gifFilePath , muscle  FROM " . $this->db_table . " WHERE discontinue = 'false' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 
        
        
		

    }
?>

