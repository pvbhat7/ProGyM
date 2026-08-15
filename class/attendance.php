<?php
    class attendance{

        // Connection
        private $conn;

        // Table
        private $db_table = "attendance";

        // Columns
        	public $id;
			public $cid;
			public $status;
			public $date;			
			public $day;
			public $month;
			public $year;
			public $timeStamp;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

       
        public function create(){
           date_default_timezone_set('Asia/Calcutta');
        $date = Date('d/m/Y');
        $d = Date('d');
        $m = Date('m');
        $y = Date('Y');
        
        $tmp = date("d-m-Y h:i:s");
        
            $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                        cid = '".$this->cid."',
						status = 1,
						date = '$date',
						day = $d,
						month = $m,
						year = $y ,
						timeStamp = '$tmp'";

	    $stmt = $this->conn->prepare($sqlQuery);
        
           
           $stmt->execute();
        $lastInsertedId = $this->conn->lastInsertId();
        return  $lastInsertedId;		
			
        }
        
        public function getByDate(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where date = '".$this -> date."' and cid = ".$this -> cid."  order by id desc";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 
        
        public function getByMonth(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where month = ".$this -> month." and year = ".$this -> year." and cid = ".$this -> cid." order by id desc ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }     
        
        public function getByYear(){
            
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where year in ('2021','2022','2023','2024','2025','2026','2027') and cid = ".$this -> cid."  order by id desc";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 
        
        public function getAllByDate(){
            $sqlQuery = "SELECT a.*,c.name as clientName FROM attendance a join client c on c.id = a.cid where a.date = '".$this -> date."'  order by a.id desc";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }  
        
        public function getAllByMonthAndYear(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where month = ".$this -> month." and year = ".$this -> year."  order by id desc";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }     
        
        public function getAllByYear(){
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where year = ".$this -> year."  order by id desc";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 	
        
        public function getByToday(){
             $date = Date('d/m/Y');
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where date = '".$date."' and cid = ".$this -> cid."  order by id desc ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        public function getByCurrentMonth(){
            $m = Date('m');
            $y = Date('Y');
            $sqlQuery = "SELECT * FROM " . $this->db_table . " where month = '".$m."' and year = '".$y."' and cid = ".$this -> cid." order by id desc ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        } 
        
        public function getLastTenDaysAttendance()
        {
            $t = date("d/m/Y", strtotime("-0 days"));
            $t_1 = date("d/m/Y", strtotime("-1 days"));
            $t_2 = date("d/m/Y", strtotime("-2 days"));
            $t_3 = date("d/m/Y", strtotime("-3 days"));
            $t_4 = date("d/m/Y", strtotime("-4 days"));
            $t_5 = date("d/m/Y", strtotime("-5 days"));
            $t_6 = date("d/m/Y", strtotime("-6 days"));
            $t_7 = date("d/m/Y", strtotime("-7 days"));
            $t_8 = date("d/m/Y", strtotime("-8 days"));
            $t_9 = date("d/m/Y", strtotime("-9 days"));
            $sqlQuery = "select a.cid , c.name , c.gender , c.mobile , a.date , a.timeStamp FROM attendance a join client c on c.id = a.cid where a.date in ('".$t."' , '".$t_1."' , '".$t_2."' , '".$t_3."' , '".$t_4."' , '".$t_5."' , '".$t_6."' , '".$t_7."' , '".$t_8."' , '".$t_9."') order by a.id desc ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        public function getLastTenDaysCount(){
            $t = date("d/m/Y", strtotime("-0 days"));
            $t_1 = date("d/m/Y", strtotime("-1 days"));
            $t_2 = date("d/m/Y", strtotime("-2 days"));
            $t_3 = date("d/m/Y", strtotime("-3 days"));
            $t_4 = date("d/m/Y", strtotime("-4 days"));
            $t_5 = date("d/m/Y", strtotime("-5 days"));
            $t_6 = date("d/m/Y", strtotime("-6 days"));
            $t_7 = date("d/m/Y", strtotime("-7 days"));
            $t_8 = date("d/m/Y", strtotime("-8 days"));
            $t_9 = date("d/m/Y", strtotime("-9 days"));
            $sqlQuery = "SELECT count(*) as count , a.date FROM attendance a where a.date in ('".$t."' , '".$t_1."' , '".$t_2."' , '".$t_3."' , '".$t_4."' , '".$t_5."' , '".$t_6."' , '".$t_7."' , '".$t_8."' , '".$t_9."')  group by a.date order by id desc;";
         
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        
		
    }
?>

