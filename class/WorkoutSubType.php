<?php
    class WorkoutSubType{

        // Connection
        private $conn;

        // Table
        private $db_table = "workoutsubtype";

        // Columns
        	public $id;
			public $wsoid;
			public $twsid;			
			public $maxReps;
			public $sets;
			public $discontinue;
			public $clientPerformance;
			public $image;

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
        public function createWorkoutSubType(){
            $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                        wsoid = '".$this->wsoid."',
						twsid = '".$this->twsid."',
						maxReps = '".$this->maxReps."',
						sets = '".$this->sets."',
						discontinue = '".$this->discontinue."',
						clientPerformance = '".$this->clientPerformance."',
						image = '".$this->image."'";

	    $stmt = $this->conn->prepare($sqlQuery);
        
           
            if($stmt->execute()){
               return true;
            }
            return false;
			
			//return $stmt->debugDumpParams();
			
        }

        // UPDATE
        public function getWorkoutSubTypeById(){
            $sqlQuery = "SELECT
						id,
                        wsoid,
						twsid,
						maxReps,
						sets,
						discontinue,
						clientPerformance,
						subTypeIdExtCode,
						image

                      FROM
                        ". $this->db_table ."
                    WHERE 
                       id = ?
                    LIMIT 0,1";

            $stmt = $this->conn->prepare($sqlQuery);

            $stmt->bindParam(1, $this->id);

            $stmt->execute();

            $dataRow = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $this->wsoid= $dataRow['wsoid'];
			$this->twsid= $dataRow['twsid'];
			$this->maxReps= $dataRow['maxReps'];
			$this->sets= $dataRow['sets'];
			$this->discontinue= $dataRow['discontinue'];
			$this->clientPerformance= $dataRow['clientPerformance'];
			$this->image= $dataRow['image'];
        }        

        // UPDATE
        public function updateWorkoutSubType(){
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
                        wsoid = '".$this->wsoid."',
						twsid = '".$this->twsid."',
						maxReps = '".$this->maxReps."',
						sets = '".$this->sets."',
						clientPerformance = '".$this->clientPerformance."',
						image = '".$this->image."',
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
		
	
		
		function getSubWorkoutPlanObjectByWsoId(){
		    $sqlQuery = "SELECT id,wsoid,twsid,maxReps,sets,discontinue,clientPerformance,image FROM " . $this->db_table ." where wsoid = ".$this->wsoid;
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
		}
		
		
		
		function updateClientWorkoutPlanStatus(){
		    $sqlQuery = "UPDATE " . $this->db_table ." set clientPerformance = 'true' where id = ".$this->id;
		    echo $sqlQuery;
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
		}

    }
?>

