<?php
    class Client{

        // Connection
        private $conn;

        // Table
        private $db_table = "client";

        // Columns
        	public $id;
			public $name;
			public $mobile;
			public $gender;
			public $birthDate;
			public $remarks;
			public $discontinue;
			public $referPoints;
			public $email;
			public $address;
			public $bloodGroup;
			public $occupation;
			public $profileActiveFlag;	
			public $photo;	
			public $reference;	
			public $previousGym;	
			public $height;	
			public $weight;			
			public $adp;
			public $awp;
			public $isPTClient;
			public $creationSource;
			public $isGymClient;
			public $admissionDate;
			public $filter;
			public $referralCode;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

        private function generateUniqueReferralCode() {
            $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            $len   = strlen($chars);
            do {
                $code = '';
                for ($i = 0; $i < 8; $i++) {
                    $code .= $chars[random_int(0, $len - 1)];
                }
                $check = $this->conn->prepare("SELECT id FROM client WHERE referralCode = ?");
                $check->execute([$code]);
            } while ($check->rowCount() > 0);
            return $code;
        }

        // GET ALL
        public function getClient(){
            $sqlQuery = "SELECT * FROM client where id = " . $this->id . "";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        
        public function createClientFromApp(){
            if($this->isGymClient == '')
            $this->isGymClient = 'no';
            $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                        name = '".$this->name."',
                        admissionDate = '".date("d/m/y")."',
						mobile = '".$this->mobile."',
						email = '".$this->email."',
						height = '".$this->height."',
						gender = '".$this->gender."',
						address = '".$this->address."',
						birthDate = '".$this->birthDate."',
						bloodGroup = '".$this->bloodGroup."',
						photo = '".$this->photo."',
						creationSource = 'app',
						isGymClient = '".$this->isGymClient."',
						discontinue = 'false',
						profileActiveFlag = 'enable',
						weight = '".$this->weight."',
						referralCode = '".$this->generateUniqueReferralCode()."'";
						
	    $stmt = $this->conn->prepare($sqlQuery);
        
           
          
           
            if($stmt->execute()){
                 $cId = $this->conn->lastInsertId();
                 $dt = date("d M Y");
                 $welcomeRewardQuery = "INSERT INTO `rewards` (`title`,`amount`, `isRedeemed`,`redeemDate`, `clientId`) VALUES ('You have won procoins','100', 'true','$dt', '$cId')";
                  $st2 = $this->conn->prepare($welcomeRewardQuery);
                  $st2->execute();
                  
                  $welcomeProCoinTxn = "INSERT INTO `procointransaction` (`txnId`, `des`, `amount`, `creditDebit`, `txnDate`, `clientId`) VALUES ('4564pt', 'Signup Welcome Bonus', '100', '1', '$dt', '$cId')";
                  $st3 = $this->conn->prepare($welcomeProCoinTxn);
                  $st3->execute();
                  
                  
               return true;
            }
            return false;
			
			//return $stmt->debugDumpParams();
			
        }

        // CREATE
        public function createClient(){
            $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                        name = '".$this->name."',
                        admissionDate = '".date("d/m/y")."',
						mobile = '".$this->mobile."',
						gender = '".$this->gender."',
						birthDate = '".$this->birthDate."',
						remarks = '".$this->remarks."',
						discontinue = '".$this->discontinue."',
						referPoints = '".$this->referPoints."',
						email = '".$this->email."',
						address = '".$this->address."',
						bloodGroup = '".$this->bloodGroup."',
						occupation = '".$this->occupation."',
						profileActiveFlag = '".$this->profileActiveFlag."',
						photo = '".$this->photo."',
						reference = '".$this->reference."',
						previousGym = '".$this->previousGym."',
						height = '".$this->height."',
						weight = '".$this->weight."',
						adp = '".$this->adp."',
						awp = '".$this->awp."',
						isPTClient = '".$this->isPTClient."',
						isGymClient = '".$this->isGymClient."',
						creationSource = '".$this->creationSource."',
						referralCode = '".$this->generateUniqueReferralCode()."'";

	    $stmt = $this->conn->prepare($sqlQuery);

            if($stmt->execute()){
                // If a referrer was specified, increment their referPoints
                $refId = intval($this->reference);
                if($refId > 0){
                    $stmtRef = $this->conn->prepare(
                        "UPDATE client SET referPoints = COALESCE(CAST(NULLIF(referPoints,'') AS UNSIGNED), 0) + 1 WHERE id = ?"
                    );
                    $stmtRef->execute([$refId]);
                }
               return true;
            }
            return false;

        }

        // UPDATE
        public function getClientById(){
            $sqlQuery = "SELECT
						id,
                        name,
						mobile,
						gender,
						birthDate,
						remarks,
						discontinue,
						referPoints,
						email email,
						address address,
						bloodGroup bloodGroup,
						occupation occupation,
						profileActiveFlag,
						photo,
						reference,
						previousGym,
						height,
						weight,
						awp,
						adp,
						isPTClient,						
						creationSource,
						isGymClient
		 
                      FROM
                        client
                    WHERE 
                       id = ?
                    LIMIT 0,1";
                    
            $stmt = $this->conn->prepare($sqlQuery);

            $stmt->bindParam(1, $this->id);

            $stmt->execute();

            $dataRow = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $this->name= $dataRow['name'];
			$this->mobile= $dataRow['mobile'];
			$this->gender= $dataRow['gender'];
			$this->birthDate= $dataRow['birthDate'];
			$this->remarks= $dataRow['remarks'];
			$this->discontinue= $dataRow['discontinue'];
			$this->referPoints= $dataRow['referPoints'];
			$this->email= $dataRow['email'];
			$this->address= $dataRow['address'];
			$this->bloodGroup= $dataRow['bloodGroup'];
			$this->occupation= $dataRow['occupation'];
			$this->profileActiveFlag= $dataRow['profileActiveFlag'];
			$this->photo= $dataRow['photo'];
			$this->reference= $dataRow['reference'];
			$this->previousGym= $dataRow['previousGym'];
			$this->height= $dataRow['height'];
			$this->weight= $dataRow['weight'];
			$this->adp= $dataRow['adp'];
			$this->awp= $dataRow['awp'];
			$this->isPTClient= $dataRow['isPTClient'];
			$this->creationSource= $dataRow['creationSource'];
			$this->isGymClient= $dataRow['isGymClient'];
        }        

        public function updateClientDataFromAppEditProfile(){
            
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
						birthDate = '".$this->birthDate."',
						email = '".$this->email."',
						address = '".$this->address."',
						height = '".$this->height."',
						weight = '".$this->weight."',
						photo = '".$this->photo."'
                    WHERE 
                        id =".$this->id."";
                        
            echo $sqlQuery;
            $stmt = $this->conn->prepare($sqlQuery);
        
            if($stmt->execute()){
               return true;
            }
            return false;
        }
        
        public function updateProfilePhoto(){
            
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
						photo = '".$this->photo."'
                    WHERE 
                        id =".$this->id."";
                        
            $stmt = $this->conn->prepare($sqlQuery);
        
            if($stmt->execute()){
               return true;
            }
            return false;
        }
            
        // UPDATE
        public function updateClient(){
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
                        name = '".$this->name."',
						mobile = '".$this->mobile."',
						gender = '".$this->gender."',
						birthDate = '".$this->birthDate."',
						remarks = '".$this->remarks."',
						discontinue = '".$this->discontinue."',
						referPoints = '".$this->referPoints."',
						email = '".$this->email."',
						address = '".$this->address."',
						bloodGroup = '".$this->bloodGroup."',
						occupation = '".$this->occupation."',
						profileActiveFlag = '".$this->profileActiveFlag."',
						reference = '".$this->reference."',
						previousGym = '".$this->previousGym."',
						photo = '".$this->photo."',
						height = '".$this->height."',
						weight = '".$this->weight."',
						adp = '".$this->adp."',
						awp = '".$this->awp."',
						isPTClient = '".$this->isPTClient."',
						creationSource = '".$this->creationSource."',
						isGymClient = '".$this->isGymClient."'
                    WHERE 
                        id =".$this->id."";
						
                      echo  $sqlQuery ;  
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
		
		function isUserMobileExists()
		{
			$sqlQuery = "SELECT id FROM " . $this->db_table . " WHERE mobile =".$this->mobile."";
            $stmt = $this->conn->prepare($sqlQuery);
			$stmt->execute();
			$dataRow = $stmt->fetch(PDO::FETCH_ASSOC); 
			return $dataRow['id'] ?? '0';
		}
		
		function getClientNameByMobile()
		{
			$sqlQuery = "SELECT name FROM " . $this->db_table . " WHERE mobile =".$this->mobile." limit 1";
            $stmt = $this->conn->prepare($sqlQuery);
			$stmt->execute();
			$dataRow = $stmt->fetch(PDO::FETCH_ASSOC); 
			return $dataRow['name'] ?? '0';
		}
		
		
		
		function isUserMobileExistsWithActiveProfile()
		{
			$sqlQuery = "SELECT id FROM " . $this->db_table . " WHERE mobile =".$this->mobile." and profileActiveFlag = 'enable' and discontinue = 'false' ";
            $stmt = $this->conn->prepare($sqlQuery);
			$stmt->execute();
			$dataRow = $stmt->fetch(PDO::FETCH_ASSOC); 
			return $dataRow['id'] ?? '0';
		}
		
		
		
		
		
		
		function getAllClientReferrals()
		{
			$sqlQuery = "SELECT * FROM client where reference = ".$this -> reference." ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
		}

		function getAllClientsForReferrals()
		{
			$sqlQuery = "SELECT id, name, mobile, gender, profileActiveFlag, isGymClient, discontinue, reference, referPoints, admissionDate FROM client WHERE discontinue != 'true' ORDER BY id ASC";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
		}
		
		
		
		// DELETE
        function delet(){
			
            $sqlQuery = "update client set discontinue = 'true' where id = ".$this -> id." ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
		// BY BLOOD GROUP
        function byBloodGroup(){
            $bg = $this -> bloodGroup;
            
            $bg_ = '';
            if($bg == 'A_plus')
                $bg_ = 'A+';
            if($bg == 'A_minus')
                $bg_ = 'A-';
			if($bg == 'B_plus')
                $bg_ = 'B+';
            if($bg == 'B_minus')
                $bg_ = 'B+';
            if($bg == 'AB_plus')
                $bg_ = 'AB+';
            if($bg == 'AB_minus')
                $bg_ = 'AB-';
            if($bg == 'O_plus')
                $bg_ = 'O+';
            if($bg == 'O_minus')
                $bg_ = 'O-';
                
            $sqlQuery = "select * from client where bloodGroup = '".$bg_."' and isGymClient = 'yes' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
		
		// BY PROFILE ACTIVE FLAG
        function byProfileActiveFlag(){
			
            $sqlQuery = "select * from client where profileActiveFlag = '".$this -> profileActiveFlag."' and isGymClient = 'yes' and discontinue = 'false' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        function getAllActiveClients()
		{
			$sqlQuery = "SELECT * FROM client where discontinue = 'false' and isGymClient = 'yes' and profileActiveFlag = 'enable' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
		}
		
		function getAllActiveClientsByGender()
		{
			$sqlQuery = "SELECT * FROM client where discontinue = 'false' and isGymClient = 'yes' and gender = '".$this -> gender."' and profileActiveFlag = 'enable' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
		}
		
		// SEARCH BY NAME
        function byName(){
			
            $sqlQuery = "select * from client where name like '%".$this -> name."%' and isGymClient = 'yes' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
		
		
		function allNonGymClients()
		{
			$sqlQuery = "select * from client where isGymClient = 'no' ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
		}
		
		
		// DELETE
        function convertToGymClient(){
			
            $sqlQuery = "update client set isGymClient = 'yes' where id = ".$this -> id." ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        /*function getActiveClientMemberStatPVO(){
            $sqlQuery = "SELECT c.id,c.name,c.gender,c.referPoints,c.profileActiveFlag,c.email,c.mobile,pd.status,pd.startDate,pd.endDate,pd.description,pd.amountPaid,pd.fees FROM 
            client c 
            join packagedetails pd on c.id = pd.clientId 
            WHERE c.profileActiveFlag = '".$this -> profileActiveFlag."' and c.isGymClient = 'yes' and c.discontinue = 'false' and pd.id in (select max(id) from packagedetails pd1 where pd1.clientId = c.id)
            order by pd.id desc";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }*/
        
           function getActiveClientMemberStatPVO(){
            $sqlQuery = "(SELECT c.id,c.name,c.gender,c.referPoints,c.profileActiveFlag,c.email,c.mobile,pd.status,pd.startDate,pd.endDate,pd.description,pd.amountPaid,pd.fees,c.photo as clientPhoto,c.isGymClient as isGymClient FROM 
            client c 
            join packagedetails pd on c.id = pd.clientId 
            WHERE c.profileActiveFlag = '".$this -> profileActiveFlag."' and c.isGymClient = 'yes'  and c.discontinue = 'false' and pd.id in (select max(id) from packagedetails pd1 where pd1.clientId = c.id)
            order by pd.id desc)
            
        union 
        (SELECT c.id,c.name,c.gender,c.referPoints,c.profileActiveFlag,c.email,c.mobile,c.name,c.name,c.name,c.name,c.id,c.id,c.photo as clientPhoto,c.isGymClient as isGymClient FROM 
                    client c 
            WHERE c.profileActiveFlag = '".$this -> profileActiveFlag."' and c.isGymClient = 'yes'  and c.discontinue = 'false' and c.id not in (select clientId from packagedetails));";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        public function getAllByFilter()
        {
            $sqlQuery ;
            if($this -> filter == 'enable')
            {
               $sqlQuery =  "select name,mobile,email,gender from client where profileActiveFlag = 'enable' ";
            }
            else if($this -> filter == 'disable')
            {
               $sqlQuery =  "select name,mobile,email,gender from client where profileActiveFlag = 'disable' "; 
            }
            else if($this -> filter == 'enabledisable'){
                $sqlQuery =  "select name,mobile,email,gender from client where discontinue = 'false' ";
            }
            else if($this -> filter == 'all'){
                $sqlQuery =  "select name,mobile,email,gender from client ";
            }
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
		
		
       

    }
?>

