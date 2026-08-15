<?php
    class Dataset{

        // Connection
        private $conn;
        
        // columns
        public $mobile;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }
        
        public function getAdmissionsDetails(){
            
            $sub_t_query = "SELECT id FROM client";
            $sub_t_query_st = $this->conn->prepare($sub_t_query);
                        $sub_t_query_st->execute();
                        
                         while ($sub_t_query_row = $sub_t_query_st->fetch(PDO::FETCH_ASSOC))
                         {
                                extract($sub_t_query_row);
                                $cid = $sub_t_query_row['id'];
                              
                                $mt_query = "SELECT c.name as 'Client Name' , pd.startDate as 'Admission Date' FROM `packagedetails` pd join client c on c.id = pd.clientId where pd.clientId = ".$cid." order by pd.id limit 1";
                                $mt_query_st = $this->conn->prepare($mt_query);
                                $mt_query_st->execute();
                                $mt_query_row = $mt_query_st->fetch(PDO::FETCH_ASSOC);
                                
                                $admission_date = $mt_query_row['Admission Date'];
                                $client_name = $mt_query_row['Client Name'];
                                
                                echo "\n".$client_name."\t\t\t".$admission_date;
                                //echo $admission_date."\n";
                                
                         }
        }
        
        public function getClientAndPackagedetailsByMobile()
        {
            
            $sqlQuery = "select c.id,c.name,c.profileActiveFlag,p.discontinue,c.photo,p.startDate,p.endDate,p.fees,p.amountPaid from packagedetails p right join client c on c.id = p.clientId 
                         where c.mobile = '".$this->mobile."' order by p.id desc limit 1";
                               $stmt = $this->conn->prepare($sqlQuery);
                                $stmt->execute();
                                return $stmt;
                                                    
        }
        
        public function markAttendanceAndGetBasicDetails()
        {
            $_mobile ;
            $mobileExists = $this -> checkIfUserMobileExists();
		    if($mobileExists)
		    {  
		        $_mobile = $this-> mobile;
		        $attendanceAlreadyMarked = $this -> checkIfAttendanceAlreadyMarked();
		        if($attendanceAlreadyMarked == 0 )
		        {
		            $this -> markAttendance();
		        }
		        
		    }
		    else
		    {
		        $_mobile = '1234554321';
		    }
		    
		    // return package details and last 3 month attendance
		        $sqlQuery = "select c.id,c.name,c.profileActiveFlag,p.discontinue,c.photo,p.startDate,p.endDate,p.fees,p.amountPaid from packagedetails p right join client c on c.id = p.clientId 
                         where c.mobile = '".$_mobile."' order by p.id desc limit 1";
                               $stmt = $this->conn->prepare($sqlQuery);
                                $stmt->execute();
                                return $stmt;
		    
            
        }
        
        public function checkIfUserMobileExists(){
            $sqlQuery = "SELECT * FROM client where mobile = '".$this -> mobile."' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            $itemCount = $stmt->rowCount();
            if($itemCount == 0 )
		        return false;
		    else return true;
            
        }
        
        public function checkIfAttendanceAlreadyMarked(){
            $date = Date('d/m/Y');
            $sqlQuery = "SELECT * FROM attendance a join client c on a.cid = c.id where c.mobile = '".$this -> mobile."' and a.date = '".$date."' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            $itemCount = $stmt->rowCount();
            return $itemCount;
        }
        
        public function markAttendance()
        {
            
            $mt_query = "SELECT * FROM client where mobile = '".$this -> mobile."'";
                    $mt_query_st = $this->conn->prepare($mt_query);
                    $mt_query_st->execute();
                    $mt_query_row = $mt_query_st->fetch(PDO::FETCH_ASSOC);
                    $cid = $mt_query_row['id'];
                    
                    
            date_default_timezone_set('Asia/Calcutta');
            $date = Date('d/m/Y');
            $d = Date('d');
            $m = Date('m');
            $y = Date('Y');
            
            $tmp = date("d-m-Y h:i:s");
            
                $sqlQuery = "INSERT INTO
                            attendance
                        SET
                            cid = '".$cid."',
    						status = 1,
    						date = '$date',
    						day = $d,
    						month = $m,
    						year = $y ,
    						timeStamp = '$tmp'";

    	    $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
        }
        

    }
?>

