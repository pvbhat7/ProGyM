<?php
    class batchlogs{

        // Connection
        private $conn;
        
        // columns
        public $id;
        public $batchName;
        public $date;
        public $status;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }
        
        
        public function checkIfBatchCompleted(){
            $sqlQuery = "SELECT * FROM batch_logs where batchName = '".$this -> batchName."' and date = '".$this -> date."' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        public function checkIfenableDisableProfileBatchCompleted(){
            $sqlQuery = "SELECT * FROM batch_logs where batchName = 'ENABLE_DISABLE_PROFILE_BATCH' and date = '".$this -> date."' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            $itemCount = $stmt->rowCount();
            return $itemCount;
        }
        
        public function create(){
            $sqlQuery = "INSERT INTO
                        batch_logs
                    SET
                        batchName = '".$this->batchName."',
						date = '".$this->date."',
						status = 'completed'";

	    $stmt = $this->conn->prepare($sqlQuery);
         $stmt->execute();
           
            return $this->conn->lastInsertId();
			
        }
        
        function triggerEnableDisableProfileBatch()
        {
            $count = $this -> checkIfenableDisableProfileBatchCompleted();
           
		    if($count == 0 )
		    {
		        // run batch
		        $batchQuery = "UPDATE client c
                                LEFT JOIN (
                                    SELECT clientId, MAX(STR_TO_DATE(endDate, '%d/%m/%Y')) AS endDate
                                    FROM packagedetails
                                    GROUP BY clientId
                                ) AS latest_pd ON c.id = latest_pd.clientId
                                SET c.profileActiveFlag = CASE
                                    WHEN latest_pd.endDate IS NOT NULL AND DATEDIFF(latest_pd.endDate, CURDATE()) >= -31 THEN c.profileActiveFlag
                                    ELSE 'disable'
                                END
                                WHERE c.profileActiveFlag <> CASE
                                    WHEN latest_pd.endDate IS NOT NULL AND DATEDIFF(latest_pd.endDate, CURDATE()) >= -31 THEN c.profileActiveFlag
                                    ELSE 'disable'
                                END;
                                ";
                                
                
                $batch_stmt = $this->conn->prepare($batchQuery);
                $batch_stmt->execute();
                $num_rows_affected = $batch_stmt->rowCount();
                
                // update batch status
		         $status_query = "INSERT INTO `batch_logs`(`batchName`, `date`, `status`) VALUES ('ENABLE_DISABLE_PROFILE_BATCH','".$this -> date."','completed')";
                 $status_stmt = $this->conn->prepare($status_query);
                 $status_stmt->execute();
                 
                 
                 return $num_rows_affected;
		    }
        }

    }
?>

