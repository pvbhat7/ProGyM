<?php
    class paymenttransaction{

        // Connection
        private $conn;

        // Table
        private $db_table = "paymenttransaction";

        // Columns
        	public $id;
			public $packageDetailsId;
			public $feesPaid;
			public $paymentDate;
			public $isApproved;
			public $clientGender;
			public $clientId;
			public $paymentMode;
			public $discontinue;
			public $proCoinsUsed;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

       
        // CREATE
        public function create(){
            $pcu = isset($this->proCoinsUsed) ? floatval($this->proCoinsUsed) : 0;
            $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                        packageDetailsId = '".$this->packageDetailsId."',
						feesPaid = '".$this->feesPaid."',
						paymentDate = '".$this->paymentDate."',
						isApproved = '".$this->isApproved."',
						clientGender = '".$this->clientGender."',
						clientId = '".$this->clientId."',
						paymentMode = '".$this->paymentMode."',
						discontinue = '".$this->discontinue."',
						proCoinsUsed = '".$pcu."'";
	    $stmt = $this->conn->prepare($sqlQuery);
        
           
            $stmt->execute();
        $lastInsertedId = $this->conn->lastInsertId();
        return  $lastInsertedId;		
			
        }
		
        // DELETE
        function delet(){
            $sqlQuery = "DELETE FROM " . $this->db_table . " WHERE id = ?";
            $stmt = $this->conn->prepare($sqlQuery);
        
            $this->id=htmlspecialchars(strip_tags($this->id));
        
            $stmt->bindParam(1, $this->id);
        
            if($stmt->execute()){
                return true;
            }
            return false;
        }
		

        // BY ID
        public function getById(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where id = ".$this -> id." ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }        

        // BY PACKAGE DETAILS ID
        public function getByPackageDetailsid(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where packageDetailsId = ".$this -> packageDetailsId." ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 

		// APPROVE TXN BY ID
        public function approveTxnById(){
            $sqlQuery = "UPDATE " . $this->db_table . " set isApproved = 'YES' where id = ".$this -> id." ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 		
        
        public function getLastTenMonthsCollection()
        {
            $cnt = 0 ;
        	$objArray []= '';
            for($i = 0;$i < $this->id ; $i++)
            {
                $mnt = "-".$i." month";
                $t = date("d/m/Y", strtotime($mnt));  
                $pieces = explode("/", $t);
                $filter = $pieces[1]."/".$pieces[2];
                $sqlQuery = "SELECT sum(feesPaid) as collection FROM `paymenttransaction` where paymentDate like '%".$filter."%'";
                $stmt = $this->conn->prepare($sqlQuery);
                $stmt->execute();
               
               	$dataRow = $stmt->fetch(PDO::FETCH_ASSOC); 
               	
               	if($pieces[1] == '01')
               	     $filter = "January ".$pieces[2];
                if($pieces[1] == '02')
               	     $filter = "February ".$pieces[2];
                if($pieces[1] == '03')
               	     $filter = "March ".$pieces[2];
               	if($pieces[1] == '04')
               	     $filter = "April ".$pieces[2];
               	if($pieces[1] == '05')
               	     $filter = "May ".$pieces[2];
               	if($pieces[1] == '06')
               	     $filter = "June ".$pieces[2];
               	if($pieces[1] == '07')
               	     $filter = "July ".$pieces[2];
               	if($pieces[1] == '08')
               	     $filter = "August ".$pieces[2];
               	if($pieces[1] == '09')
               	     $filter = "September ".$pieces[2];
               	if($pieces[1] == '10')
               	     $filter = "October ".$pieces[2];
               	if($pieces[1] == '11')
               	     $filter = "November ".$pieces[2];
               	if($pieces[1] == '12')
               	     $filter = "December ".$pieces[2];
               	     
               	     
			    $objArray[$i] = array(
		    "key0" =>  $filter,
             "key1" =>  "Rs.".$dataRow['collection']
            );
			    
			    
               
            }
            
            return $objArray;
        }
        
        public function getInvoiceByTxnId(){
                $sqlQuery = "SELECT txn.id , c.email as clientEmail , c.name as clientName , concat(pd.startDate ,' - ', pd.endDate) as duration ,  p.description as packageName , 
                pd.paymentDate ,
                txn.id as paymentTransactionId, pd.fees , pd.amountPaid FROM paymenttransaction txn 
                join client c on txn.clientId = c.id
                join packagedetails pd on pd.id = txn.packageDetailsId
                join packages p on p.id = pd.packageId
                WHERE txn.id = ".$this -> id." ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
		
    }
?>

