<?php
    class brand_images{

        // Connection
        private $conn;

        // Table
        private $db_table = "brand_images";

        // Columns
        	public $id;
        	public $login_brand_logo;
			public $banner_1;
			public $owner_1;
			public $owner_2;
			public $trainer_1;
			public $trainer_2;
			public $appBanner_1;
			public $appBanner_2;
			public $appBanner_3;
			public $appBanner_4;
			public $appAdvertise_1;
			public $appAdvertise_2;
			public $appAdvertise_3;
			public $appAdvertise_4;
			public $appBanner_1Contact;
			public $appBanner_2Contact;
			public $appBanner_3Contact;
			public $appBanner_4Contact;
			public $appAdvertise_1Contact;
			public $appAdvertise_2Contact;
			public $appAdvertise_3Contact;
			public $appAdvertise_4Contact;
			public $h1;
			public $h2;
			public $h3;
			public $h4;
			public $h5;
			public $upgradePlan1_img;
			public $upgradePlan2_img;
			public $upgradePlan3_img;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

        // GET ALL 
        public function getBrandImages(){
            $sqlQuery = "SELECT id , login_brand_logo , banner_1 , owner_1 , owner_2 , trainer_1 , trainer_2 , appBanner_1 , appBanner_2 , appBanner_3 , appBanner_4 , appAdvertise_1 , appAdvertise_2 , appAdvertise_3 , appAdvertise_4 , appBanner_1Contact , appBanner_2Contact , appBanner_3Contact , appBanner_4Contact , appAdvertise_1Contact , appAdvertise_2Contact , appAdvertise_3Contact , appAdvertise_4Contact , h1 , h2 , h3 , h4 , h5 , upgradePlan1_img , upgradePlan2_img , upgradePlan3_img FROM " . $this->db_table . " where id = 1";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
       

        // UPDATE BY ID
        public function updateBrandImages(){
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
                        login_brand_logo = '".$this->login_brand_logo."',
						banner_1 = '".$this->banner_1."',
						owner_1 = '".$this->owner_1."',
						owner_2 = '".$this->owner_2."',
						trainer_1 = '".$this->trainer_1."',
						trainer_2 = '".$this->trainer_2."',
						appBanner_1 = '".$this->appBanner_1."',
						appBanner_2 = '".$this->appBanner_2."',
						appBanner_3 = '".$this->appBanner_3."',
						appBanner_4 = '".$this->appBanner_4."',
						appAdvertise_1 = '".$this->appAdvertise_1."',
						appAdvertise_2 = '".$this->appAdvertise_2."',
						appAdvertise_3 = '".$this->appAdvertise_3."',
						appAdvertise_4 = '".$this->appAdvertise_4."',
						appBanner_1Contact = '".$this->appBanner_1Contact."',
						appBanner_2Contact = '".$this->appBanner_2Contact."',
						appBanner_3Contact = '".$this->appBanner_3Contact."',
						appBanner_4Contact = '".$this->appBanner_4Contact."',
						appAdvertise_1Contact = '".$this->appAdvertise_1Contact."',
						appAdvertise_2Contact = '".$this->appAdvertise_2Contact."',
						appAdvertise_3Contact = '".$this->appAdvertise_3Contact."',
						appAdvertise_4Contact = '".$this->appAdvertise_4Contact."',
						h1 = '".$this->h1."',
						h2 = '".$this->h2."',
						h3 = '".$this->h3."',
						h4 = '".$this->h4."',
						h5 = '".$this->h5."',
						upgradePlan1_img = '".$this->upgradePlan1_img."',
						upgradePlan2_img = '".$this->upgradePlan2_img."',
						upgradePlan3_img = '".$this->upgradePlan3_img."'
                    WHERE 
                        id = 1 ";
                        

            $stmt = $this->conn->prepare($sqlQuery);
        
            if($stmt->execute()){
               return true;
            }
            return false;
        }


    }
?>

