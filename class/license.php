<?php
    class license{

        // Connection
        private $conn;

        // Table
        private $db_table = "license_data";

        // Columns
        	public $id;
        	public $clientName;
        	public $clientMobile;
        	public $clientEmail;
        	public $txnDate;
        	public $txnId;
        	public $txnStatus;
        	public $activationDate;
        	public $pkg;
        	public $validity;
        	public $amount;
        	public $secret_key;
        	public $discontinue;
        	public $mac;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }
        
        public function checkIfExistByMac(){
            $res = 0;
            $sqlQuery = "SELECT * FROM Module where mac = '".$this -> mac."' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            $itemCount = $stmt->rowCount();
            if($itemCount > 0){
             $row = $stmt->fetch(PDO::FETCH_ASSOC);
             $res = $row['id'];
            }
            return $res;
        }
      
        // CREATE
        public function create(){
            
            $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                        clientName = '".$this->clientName."',
						clientMobile = '".$this->clientMobile."',
						clientEmail = '".$this->clientEmail."',
						txnDate = '".$this->txnDate."',
						txnStatus = '".$this->txnStatus."',
						pkg = '".$this->pkg."',
						amount = '".$this->amount."',
						discontinue = '".$this->discontinue."',
						validity = '".$this->validity."'";
						
	        $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            $lastInsertedId = $this->conn->lastInsertId();
            return  $lastInsertedId;
			
        }
        
        function getSecretKey(){
    		    $sqlQuery = "select * from license_data where discontinue = 'false' and txnStatus = 'paid' and id = ".$this -> id." ";    
                $stmt = $this->conn->prepare($sqlQuery);
                $stmt->execute();
                return $stmt;
	    	}
	    	
	    	function getPAMStatus()
	    	{
	    	    $sqlQuery = "select * from license_data where mac = '".$this -> mac."' and discontinue = 'false' ";    
                $stmt = $this->conn->prepare($sqlQuery);
                $stmt->execute();
                $itemCount = $stmt->rowCount();
                if($itemCount > 0){
                     $row = $stmt->fetch(PDO::FETCH_ASSOC);
                     $expDate = $row['expiryDate'];
                     $curDate = date('d/m/Y');
                     //echo $expDate.'  '.$curDate;
                     $expDate_ = implode('', array_reverse(explode('/', $expDate)));
                    $curDate_ = implode('', array_reverse(explode('/', $curDate)));
                    
                    if ($expDate_ < $curDate_) // 20100428 < 20090501
                    {
                      // pkg expired
                        $dis_query = "update license_data set discontinue = 'true' where mac = '".$this -> mac."' ";    
                        $dis_query_st = $this->conn->prepare($dis_query);
                        $dis_query_st->execute();
                        return false;
                    }
                    else
                    {
                        $sqlQuery = "select * from license_data where mac = '".$this -> mac."' and discontinue = 'false' ";    
                        $stmt = $this->conn->prepare($sqlQuery);
                        $stmt->execute();
                        return $stmt; 
                    }
                   
                }
                else
                return $stmt;
	    	}
	    	
	    	function activateProduct(){
	    	    
	    	    $validateKeyQuery = "select * from license_data where secret_key = '".$this -> secret_key."' ";    
                $validateKeyQuery_st = $this->conn->prepare($validateKeyQuery);
                $validateKeyQuery_st->execute();
                $validateKeyQuery_count = $validateKeyQuery_st->rowCount();
                if($validateKeyQuery_count == 0)
                {
                    return -1;
                }
                else
                {
                    $sqlQuery = "select * from license_data where discontinue = 'false' and txnStatus = 'paid' and mac != '' and secret_key = '".$this -> secret_key."' ";    
                    $stmt = $this->conn->prepare($sqlQuery);
                    $stmt->execute();
                    $itemCount = $stmt->rowCount();
                    
                    if($itemCount > 0)
                    {
                        return 0;
                    }
                    else
                    {
                        // link mac + key
                        $curDate = Date('d/m/Y');
                        
                        $sqlQuery = "update license_data set expiryDate = '".Date('d/m/Y', strtotime('+30 days'))."' , activationDate = '".$curDate."' ,  mac = '".$this -> mac."' where secret_key = '".$this -> secret_key."' "; 
                        $stmt = $this->conn->prepare($sqlQuery);
                        $stmt->execute();

                        $curPkg = "select * from license_data where mac = '".$this -> mac."' and secret_key = '".$this -> secret_key."' ";    
                        $curPkg_st = $this->conn->prepare($curPkg);
                        $curPkg_st->execute();
                        $curPkg_row = $curPkg_st->fetch(PDO::FETCH_ASSOC);
                         $id_ = $this-> checkIfExistByMac();

                        if($curPkg_row['pkg'] == 'Bronze Package')
                        {  
                           
                            if($id_ == 0)
                            {
                                 $insert_query = "INSERT INTO `Module` (`mac`, `email`, `sms`, `diet`, `workout`, `monthlyData`) 
                                VALUES ('".$this -> mac."', 'TRUE', 'TRUE', 'FALSE', 'FALSE', 'FALSE')";
                                $insert_query_st = $this->conn->prepare($insert_query);
                                $insert_query_st->execute();
                            }
                            else
                            {
                                $update_qry = "UPDATE `Module` set email = 'TRUE' , sms = 'TRUE' , diet = 'FALSE' ,workout = 'FALSE' ,monthlyData = 'FALSE' where id = ".$id_." ";
                                $update_qry_st = $this->conn->prepare($update_qry);
                                $update_qry_st->execute();
                            }
                        }
                        else
                        { 
                            if($id_ == 0)
                            {
                                 $insert_query = "INSERT INTO `Module` (`mac`, `email`, `sms`, `diet`, `workout`, `monthlyData`) 
                                VALUES ('".$this -> mac."', 'TRUE', 'TRUE', 'TRUE', 'TRUE', 'TRUE')";
                                $insert_query_st = $this->conn->prepare($insert_query);
                                $insert_query_st->execute();
                            }
                            else
                            {
                                $update_qry = "UPDATE `Module` set email = 'TRUE' , sms = 'TRUE' , diet = 'TRUE' ,workout = 'TRUE' ,monthlyData = 'TRUE' where id = ".$id_." ";
                                $update_qry_st = $this->conn->prepare($update_qry);
                                $update_qry_st->execute();
                            }
                        }
                        
                        return 1;
                        
                        
                    }
                }
                
                
    		    
                return $stmt;
	    	}
        
        // GET BY EMAIL
        	function getByEmail(){
    		    $sqlQuery = "select * from license_data where discontinue = 'false' and clientEmail = '".$this -> clientEmail."' order by id desc";    
                $stmt = $this->conn->prepare($sqlQuery);
                $stmt->execute();
                return $stmt;
	    	}
		
		// GET BY EMAIL
        	function getByMobile(){
    		    $sqlQuery = "select * from license_data where discontinue = 'false' and clientMobile = '".$this -> clientMobile."' order by id desc";    
                $stmt = $this->conn->prepare($sqlQuery);
                $stmt->execute();
                return $stmt;
	    	}
       

        // UPDATE BY ID
        public function update(){
            $rnd = rand(999,99999);
            $key = 'GGS-'.$rnd;
            $actDate = date('d/m/Y');
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
                        txnId = '".$this->txnId.",'
                        txnStatus = '".$this->txnStatus.",'
                        secret_key = '".$key.",'
                        txnStatus = '".$this->txnStatus.",'
                        $activationDate = '".$actDate."'
                    WHERE 
                        id =".$this->id."";
                        
            $stmt = $this->conn->prepare($sqlQuery);
        
            if($stmt->execute()){
            
               return true;
            }
            return false;
        }
       
    }
?>

