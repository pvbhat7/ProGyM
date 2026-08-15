<?php
    class Dietplantemplate{

        // Connection
        private $conn;

        // Table
        private $db_table = "dietplantemplate";

        // Columns
	public $id;
	public $cid;
	public $name;
	public $createDate;
    public $discontinue;    	
    public $time_1;    
    public $activity_1;    
    public $time_2;    
    public $activity_2;    
    public $time_3;    
    public $activity_3;
    public $time_4;    
    public $activity_4;
    public $time_5;    
    public $activity_5;
    public $time_6;    
    public $activity_6;
    public $time_7;    
    public $activity_7;
    public $time_8;    
    public $activity_8;
    public $time_9;    
    public $activity_9;
    public $time_10;    
    public $activity_10;
    public $time_11;    
    public $activity_11;
    public $time_12;    
    public $activity_12;
    public $time_13;    
    public $activity_13;
    public $time_14;    
    public $activity_14;
    public $time_15;    
    public $activity_15;
    public $time_16;    
    public $activity_16;
    public $time_17;    
    public $activity_17;
    

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
        
        public function getDefaultDietTemplates(){
            $sqlQuery = "SELECT * FROM dietplantemplate WHERE cid is null or cid = 0";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }  
        
        public function getClientPreviousTemplates(){
            $sqlQuery = "SELECT * FROM dietplantemplate WHERE cid = ".$this -> cid." and id not in (' ".$this -> adp." ') order by id desc limit 3 ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }  
        
        

        // CREATE
		public function createDietplantemplate(){
		
            $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                             cid= '".$this->cid."',    
							 name= '".$this->name."',    
							 createDate= '".$this->createDate."',    
							 discontinue= '".$this->discontinue."',
							 time_1= '".$this->time_1."',    
							 activity_1= '".$this->activity_1."',    
							 time_2= '".$this->time_2."',    
							 activity_2= '".$this->activity_2."',    
							 time_3= '".$this->time_3."',    
							 activity_3= '".$this->activity_3."',    
							 time_4= '".$this->time_4."',    
							 activity_4= '".$this->activity_4."',    
							 time_5= '".$this->time_5."',    
							 activity_5= '".$this->activity_5."',    
							 time_6= '".$this->time_6."',    
							 activity_6= '".$this->activity_6."',    
							 time_7= '".$this->time_7."',    
							 activity_7= '".$this->activity_7."',    
							 time_8= '".$this->time_8."',    
							 activity_8= '".$this->activity_8."',
							 time_9= '".$this->time_9."',    
							 activity_9= '".$this->activity_9."',    
							 time_10= '".$this->time_10."',    
							 activity_10= '".$this->activity_10."',    
							 time_11= '".$this->time_11."',    
							 activity_11= '".$this->activity_11."',    
							 time_12= '".$this->time_12."',    
							 activity_12= '".$this->activity_12."',    
							 time_13= '".$this->time_13."',    
							 activity_13= '".$this->activity_13."',    
							 time_14= '".$this->time_14."',    
							 activity_14= '".$this->activity_14."',    
							 time_15= '".$this->time_15."',    
							 activity_15= '".$this->activity_15."',    
							 time_16= '".$this->time_16."',    
							 activity_16= '".$this->activity_16."',    
							 time_17= '".$this->time_17."',    
							 activity_17= '".$this->activity_17."'";    
						
	    $stmt = $this->conn->prepare($sqlQuery);
        
           
            $stmt->execute();
            $lastInsertedId = $this->conn->lastInsertId();
            return  $lastInsertedId;
			
			//return $stmt->debugDumpParams();
			
        }

        // BY ID
        public function getDietplantemplateById(){
            $sqlQuery = "select * from dietplantemplate where id = ".$this -> id." ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;  
        }  

    public function getDietplantemplateByExtCode(){
            $sqlQuery = "SELECT
						id,
						cid,
						name,
						createDate,    
						discontinue,    
						time_1,    
						activity_1,    
						time_2,    
						activity_2,    
						time_3,    
						activity_3,    
						time_4,    
						activity_4,    
						time_5,    
						activity_5,    
						time_6,    
						activity_6,    
						time_7,    
						activity_7,    
						time_8,    
						activity_8,
						time_9,    
						activity_9,    
						time_10,    
						activity_10,    
						time_11,    
						activity_11,    
						time_12,    
						activity_12,    
						time_13,    
						activity_13,    
						time_14,    
						activity_14,    
						time_15,    
						activity_15,    
						time_16,    
						activity_16,   
						time_17,
						activity_17,
						externalCode
		 
                      FROM
                        ". $this->db_table ."
                    WHERE 
                       externalCode = ?
                    LIMIT 0,1";

            $stmt = $this->conn->prepare($sqlQuery);

            $stmt->bindParam(1, $this->externalCode);

            $stmt->execute();

            $dataRow = $stmt->fetch(PDO::FETCH_ASSOC);
            
			$this->id= $dataRow['id'];    
            $this->cid= $dataRow['cid'];    
			$this->name= $dataRow['name'];    
			$this->createDate= $dataRow['createDate'];    
			$this->discontinue= $dataRow['discontinue'];    
			$this->time_1= $dataRow['time_1'];    
			$this->activity_1= $dataRow['activity_1'];    
			$this->time_2= $dataRow['time_2'];    
			$this->activity_2= $dataRow['activity_2'];    
			$this->time_3= $dataRow['time_3'];    
			$this->activity_3= $dataRow['activity_3'];    
			$this->time_4= $dataRow['time_4'];    
			$this->activity_4= $dataRow['activity_4'];    
			$this->time_5= $dataRow['time_5'];    
			$this->activity_5= $dataRow['activity_5'];    
			$this->time_6= $dataRow['time_6'];    
			$this->activity_6= $dataRow['activity_6'];    
			$this->time_7= $dataRow['time_7'];    
			$this->activity_7= $dataRow['activity_7'];    
			$this->time_8= $dataRow['time_8'];    
			$this->activity_8= $dataRow['activity_8'];
			$this->time_9= $dataRow['time_9'];    
			$this->activity_9= $dataRow['activity_9'];    
			$this->time_10= $dataRow['time_10'];    
			$this->activity_10= $dataRow['activity_10'];    
			$this->time_11= $dataRow['time_11'];    
			$this->activity_11= $dataRow['activity_11'];    
			$this->time_12= $dataRow['time_12'];    
			$this->activity_12= $dataRow['activity_12'];    
			$this->time_13= $dataRow['time_13'];    
			$this->activity_13= $dataRow['activity_13'];    
			$this->time_14= $dataRow['time_14'];    
			$this->activity_14= $dataRow['activity_14'];    
			$this->time_15= $dataRow['time_15'];    
			$this->activity_15= $dataRow['activity_15'];    
			$this->time_16= $dataRow['time_16'];    
			$this->activity_16= $dataRow['activity_16'];    
			$this->time_17= $dataRow['time_17'];    
			$this->activity_17= $dataRow['activity_17'];    
        }  		

        // UPDATE
        public function updateDietplantemplate(){
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
							 cid= '".$this->cid."',    
							 name= '".$this->name."',    
							 createDate= '".$this->createDate."',    
							 discontinue= '".$this->discontinue."',    
							 time_1= '".$this->time_1."',    
							 activity_1= '".$this->activity_1."',    
							 time_2= '".$this->time_2."',    
							 activity_2= '".$this->activity_2."',    
							 time_3= '".$this->time_3."',    
							 activity_3= '".$this->activity_3."',    
							 time_4= '".$this->time_4."',    
							 activity_4= '".$this->activity_4."',    
							 time_5= '".$this->time_5."',    
							 activity_5= '".$this->activity_5."',    
							 time_6= '".$this->time_6."',    
							 activity_6= '".$this->activity_6."',    
							 time_7= '".$this->time_7."',    
							 activity_7= '".$this->activity_7."',    
							 time_8= '".$this->time_8."',    
							 activity_8= '".$this->activity_8."',
							 time_9= '".$this->time_9."',    
							 activity_9= '".$this->activity_9."',    
							 time_10= '".$this->time_10."',    
							 activity_10= '".$this->activity_10."',    
							 time_11= '".$this->time_11."',    
							 activity_11= '".$this->activity_11."',    
							 time_12= '".$this->time_12."',    
							 activity_12= '".$this->activity_12."',    
							 time_13= '".$this->time_13."',    
							 activity_13= '".$this->activity_13."',    
							 time_14= '".$this->time_14."',    
							 activity_14= '".$this->activity_14."',    
							 time_15= '".$this->time_15."',    
							 activity_15= '".$this->activity_15."',    
							 time_16= '".$this->time_16."',    
							 activity_16= '".$this->activity_16."',    
							 time_17= '".$this->time_17."',    
							 activity_17= '".$this->activity_17."'  							 
                    WHERE 
                        id =".$this->id."";
                        
                        echo $sqlQuery;
        
            $stmt = $this->conn->prepare($sqlQuery);
        
            if($stmt->execute()){
               return true;
            }
            return false;
        }

        // DELETE
        function deleteDietplantemplate(){
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
		
		function getMaxId()
		{
			$sqlQuery = "SELECT max(id) as maxId FROM " . $this->db_table . "";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
		}

    }
?>

