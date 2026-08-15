<?php
    class WorkoutScheduleObject{

        // Connection
        private $conn;

        // Table
        private $db_table = "workoutscheduleobject";

        // Columns
        	public $id;
			public $cid;
			public $mtid;			
			public $date;			
			public $discontinue;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }
        
        public function checkIfExistByClientIdAndDate(){
            $sqlQuery = "SELECT * FROM workoutscheduleobject where cid = ".$this -> cid." and date = '".$this->date."' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            $itemCount = $stmt->rowCount();
            return $itemCount;
        }
        
        public function checkIfClientHasAwp(){
            $sqlQuery = "SELECT * FROM client where awp != '' and id = ".$this -> cid;
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            $itemCount = $stmt->rowCount();
            return $itemCount;
        }


        public function handleCreateObjectOperation()
        {  
            $count = $this -> checkIfExistByClientIdAndDate();
		    if($count == 0 )
		    {   
		        $cnt = $this -> checkIfClientHasAwp();
		        if($cnt != 0)
		        {   
		            
		            $mt_query = "SELECT * FROM client where awp is not null and id = ".$this -> cid;
                    $mt_query_st = $this->conn->prepare($mt_query);
                    $mt_query_st->execute();
                    $mt_query_row = $mt_query_st->fetch(PDO::FETCH_ASSOC);
                    $profileActiveStatus = $mt_query_row['profileActiveFlag'];
                    if($profileActiveStatus == 'enable')
                    {
                        
                        $mtid_ = $mt_query_row['awp'];
		            $wos_query = "INSERT INTO `workoutscheduleobject` (`cid`, `mtid`, `date`, `discontinue`) 
		            VALUES ( ".$this -> cid." , '".$mtid_."','".$this -> date."', 'false')";
		            
		            $wos_st = $this->conn->prepare($wos_query);
                    $wos_st ->execute();
                    $wos_id = $this->conn->lastInsertId();

                    $qry_1 = "SELECT * FROM t_workoutmaintype where id = ".$mtid_." ";
                    $qry_1_st = $this->conn->prepare($qry_1);
                    $qry_1_st->execute();
                    $qry_1_row = $qry_1_st->fetch(PDO::FETCH_ASSOC);
                    
                    if(
                    $qry_1_row['name'] == 'Single Muscle - 1' || 
                    $qry_1_row['name'] == 'Single Muscle - 2' || 
                    $qry_1_row['name'] == 'Single Muscle - 3' || 
                    $qry_1_row['name'] == 'Double Muscle - 1' ||
                    $qry_1_row['name'] == 'Double Muscle - 2' ||
                    $qry_1_row['name'] == 'Double Muscle - 3' ||
                    $qry_1_row['name'] == 'Ladies Level - 3'
                    )
                    {   
                        // assigne special day workouts
                        $dateObj = \DateTime::createFromFormat('d/m/Y', $this->date);
                        $dayOfWeek = $dateObj ? $dateObj->format('l') : date('l');
                         $mus_wt_qry = "SELECT * FROM muscleworkout where day = '".$dayOfWeek."'  and mainWorkoutName = '".$qry_1_row['name']."' ";
                        
                        $mus_wt_qry_st = $this->conn->prepare($mus_wt_qry);
                        $mus_wt_qry_st->execute();
                        $mus_wt_row = $mus_wt_qry_st->fetch(PDO::FETCH_ASSOC);
                        $nw_wrkt_name = $mus_wt_row['subWorkoutName'];
                        
                        $nw_wrkt_obj = "SELECT * FROM t_workoutmaintype where name = '".$nw_wrkt_name."' ";
                        
                        $nw_wrkt_obj_st = $this->conn->prepare($nw_wrkt_obj);
                        $nw_wrkt_obj_st->execute();
                        $nw_wrkt_obj_row = $nw_wrkt_obj_st->fetch(PDO::FETCH_ASSOC);
                        $nw_mtid = $nw_wrkt_obj_row['id'];
                  
                        
                        
                        $wos_update_query = "update workoutscheduleobject set mtid = '".$nw_mtid."' where id =  ".$wos_id." ";
                    
                        $wos_update_quer_st = $this->conn->prepare($wos_update_query);
                        $wos_update_quer_st->execute();
                        
                        $sub_t_query = "SELECT * FROM t_workoutsubtype where mtid = ".$nw_mtid." and discontinue = 'false' ";
                        $sub_t_query_st = $this->conn->prepare($sub_t_query);
                        $sub_t_query_st->execute();
                        
                         while ($sub_t_query_row = $sub_t_query_st->fetch(PDO::FETCH_ASSOC))
                         {
                                extract($sub_t_query_row);
                              
                                $subtype_insert_query_1 = "INSERT INTO `workoutsubtype` (`wsoid`, `twsid`, `maxReps`, `sets`, `discontinue`,`clientPerformance`, `image`) 
                                VALUES (".$wos_id.", '".$sub_t_query_row['name']."', '".$sub_t_query_row['reps']."', ".$sub_t_query_row['sets'].", 'false', 'false', '".$sub_t_query_row['gifFilePath']."')";
                                $subtype_insert_query_1_st = $this->conn->prepare($subtype_insert_query_1);
                                $subtype_insert_query_1_st->execute();
                                
                        }
                        
                        
                    }
                    else
                    {
                        // assign default workouts
                        $qry_2 = "SELECT * FROM t_workoutsubtype where mtid = ".$mtid_." and discontinue = 'false'";
                        //echo $qry_2;
                        $qry_2_st = $this->conn->prepare($qry_2);
                        $qry_2_st->execute();
                        
                         while ($qry_2_row = $qry_2_st->fetch(PDO::FETCH_ASSOC))
                         {
                                extract($qry_2_row);
                              
                                $subtype_insert_query = "INSERT INTO `workoutsubtype` (`wsoid`, `twsid`, `maxReps`, `sets`, `discontinue`,`clientPerformance`, `image`) VALUES (".$wos_id.", '".$qry_2_row['name']."', '".$qry_2_row['reps']."', ".$qry_2_row['sets'].", 'false', 'false',  '".$qry_2_row['gifFilePath']."')";
                                //echo $subtype_insert_query;
                                $subtype_insert_query_st = $this->conn->prepare($subtype_insert_query);
                                $subtype_insert_query_st->execute();
                                
                        }
                        
                        
                        
                    }
                    }
                    
                    
                    
		        }
		    }
        }

        // GET ALL
        public function getClient(){
            $sqlQuery = "SELECT id, name, email, age, designation, created FROM " . $this->db_table . "";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }

        // CREATE
        public function createWorkoutScheduleObject(){
            $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                        cid = '".$this->cid."',
						mtid = '".$this->mtid."',
						date = '".$this->date."',
						discontinue = '".$this->discontinue."'";

	    $stmt = $this->conn->prepare($sqlQuery);
        
           
            if($stmt->execute()){
               return true;
            }
            return false;
			
			//return $stmt->debugDumpParams();
			
        }

        // UPDATE
        public function getWorkoutScheduleObjectById(){
            $sqlQuery = "SELECT
						id,
                        cid,
						mtid,
						date,
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
            
            $this->cid= $dataRow['cid'];
			$this->mtid= $dataRow['mtid'];
			$this->date= $dataRow['date'];
			$this->discontinue= $dataRow['discontinue'];
        }        

        // UPDATE
        public function updateWorkoutScheduleObject(){
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
                        cid = '".$this->cid."',
						mtid = '".$this->mtid."',
						date = '".$this->date."',
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
	
		
		public function getAllByClientId(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where cid = '".$this -> cid."' order by id desc limit 3";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
			
        }
		
		public function getWorkoutPlanObjectClientIdAndDate(){
		    
		    $this -> handleCreateObjectOperation();
		    
		    
            $sqlQuery = "SELECT a.id,a.cid,a.mtid,a.date,a.discontinue,b.name FROM ". $this->db_table ." a join t_workoutmaintype b on a.mtid  = b.id WHERE a.date = ? and a.cid = ? LIMIT 0,1";

            $stmt = $this->conn->prepare($sqlQuery);

            $stmt->bindParam(1, $this->date);
			$stmt->bindParam(2, $this->cid);

            $stmt->execute();

            $dataRow = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$dataRow) { return; }

			$this->id= $dataRow['id'];
			$this->cid= $dataRow['cid'];
			$this->mtid= $dataRow['mtid'];
			$this->date= $dataRow['date'];
			$this->discontinue= $dataRow['discontinue'];
			$this->externalCode= $dataRow['name'];

        }

    }
?>

