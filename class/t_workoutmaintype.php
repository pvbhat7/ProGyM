<?php
    class t_workoutmaintype{

        // Connection
        private $conn;

        // Table
        private $db_table = "t_workoutmaintype";

        // Columns
        	public $id;
			public $name;
			public $discontinue;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }


        // CREATE
        public function createMainWorkoutType(){
            $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                        name = '".$this->name."',
						discontinue = '".$this->discontinue."'";

	    $stmt = $this->conn->prepare($sqlQuery);
        
           
            if($stmt->execute()){
               return true;
            }
            return false;
			
			//return $stmt->debugDumpParams();
			
        }

        // UPDATE
        public function getMainWorkoutTypeById(){
            $sqlQuery = "SELECT
						id,
                        name,
						discontinue

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
			$this->discontinue= $dataRow['discontinue'];
        }        

        // UPDATE
        public function updateMainWorkoutType(){
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
                        name = '".$this->name."',
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
		
		public function getAll(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " WHERE discontinue = 'false' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 

    }
?>

