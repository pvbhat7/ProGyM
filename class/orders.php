<?php
    class Orders{

        // Connection
        private $conn;

        // Table
        private $db_table = "orders";

        // Columns
        	public $order_id;
        	public $img;
			public $name;
			public $date;
			public $status;
			public $clientId;
			public $amount;
			public $txnId;
			public $paymentStatus;
			public $trackingDetails;
			public $proCoinsused;
			public $couponUsed;

        // Db connection
        public function __construct($db){
            $this->conn = $db;
        }

        // GET ALL 
        public function getAllOrders(){
            $filter = $this -> filter;
            $sqlQuery = '';
            if($filter == 'all')
            {
             $sqlQuery = "select o.order_id , c.id as 'clientServerId' , c.externalCode as 'clientDesktopId' ,  o.img as 'productImg', c.photo as 'clientImg' ,o.name  as 'productName' , o.amount as 'amount' , o.status as 'orderStatus' ,o.date as 'orderDate' , o.paymentStatus as 'orderPaymentStatus' , o.trackingDetails , c.name as 'clientName',c.mobile  as 'clientMobile', c.email  as 'clientEmail' from orders o join client c on c.id = o.clientId where o.status != 'Pending' order by o.order_id desc";     
            }
            else
            {
                 $sqlQuery = "select o.order_id , c.id as 'clientServerId' , c.externalCode as 'clientDesktopId' ,  o.img as 'productImg', c.photo as 'clientImg' ,o.name  as 'productName' , o.amount as 'amount' , o.status as 'orderStatus' ,o.date as 'orderDate' , o.paymentStatus as 'orderPaymentStatus' , o.trackingDetails , c.name as 'clientName',c.mobile  as 'clientMobile', c.email  as 'clientEmail' from orders o join client c on c.id = o.clientId where o.status = '".$filter."' order by o.order_id desc";
            }
           
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
        }
        
        	function sendFCM($title,$body,$img,$key) {
      $apiKey = "AAAArT6uHZ8:APA91bG2R01CatD2LOa-1dePZEQu0rZ3cioXD0CR53iWrBKdfP0zFxWYU4OYjIHHGQewA8oR3WLoIc_5aUN6EwQys6DDzzx_msYNwD0LTcq8PJ9jqifeIMgeMpYl9-5ON5ZOgwZSzlvi";

          $headers = array (
            'Authorization:key=' . $apiKey,
            'Content-Type:application/json'
          );
        
          $notifData = [
            'title' => $title,
            'body' => $body,
            'image' => $img,
            //  "image": "url-to-image",//Optional
            'click_action' => "activities.NotifHandlerActivity" //Action/Activity - Optional
          ];
        
          $dataPayload = [
           'notificationType'=> 'collapsed', 
          'points'=>80, 
          'other_data' => 'This is extra payload'
          ];
        
          // Create the api body
          $apiBody = [
            'notification' => $notifData,
            'data' => $dataPayload, //Optional
            'time_to_live' => 600, // optional - In Seconds
            //'to' => '/topics/mytargettopic'
            //'registration_ids' = ID ARRAY
            'to' => $key
          ];
        
          // Initialize curl with the prepared headers and body
          $ch = curl_init();
          curl_setopt ($ch, CURLOPT_URL, 'https://fcm.googleapis.com/fcm/send');
          curl_setopt ($ch, CURLOPT_POST, true);
          curl_setopt ($ch, CURLOPT_HTTPHEADER, $headers);
          curl_setopt ($ch, CURLOPT_RETURNTRANSFER, true);
          curl_setopt ($ch, CURLOPT_POSTFIELDS, json_encode($apiBody));
        
          // Execute call and save result
          $result = curl_exec($ch);
          print($result);
          // Close curl after call
          curl_close($ch);
        
          return $result;
        }
        
        // CREATE
        public function createOrderFromApp(){
            
            $sqlQuery = "INSERT INTO
                        ". $this->db_table ."
                    SET
                        img = '".$this->img."',
						name = '".$this->name."',
						date = '".$this->date."',
						status = '".$this->status."',
						clientId = '".$this->clientId."',
						amount = '".$this->amount."',
						paymentStatus = '".$this->paymentStatus."',
						proCoinsUsed = '".$this->proCoinsUsed."',
						couponUsed = '".$this->couponUsed."'";
	        $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            $lastInsertedId = $this->conn->lastInsertId();
            return  $lastInsertedId;
			
        }
        
        // GET BY ID
        	function getOrderByClientId(){
		    $sqlQuery = "SELECT  order_id , img , name , date , status , clientId , amount , txnId , paymentStatus , trackingDetails  , proCoinsUsed , couponUsed FROM " . $this->db_table ." where status != 'Pending' and clientId = ".$this->clientId." order by order_id desc ";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
		}
       

        // UPDATE BY ID
        public function updateOrderFromApp(){
            $cId = $this->clientId;
            $stat_ = $this->paymentStatus;
            $oId = $this->order_id;
            $coinUsed_ = $this->proCoinsUsed;
            $couponUsed_ = $this->couponUsed;
            $txn_ = $this->txnId;
           
            $sqlQuery = "UPDATE
                        ". $this->db_table ."
                    SET
                        status = '".$this->status."',
						clientId = '".$this->clientId."',
						paymentStatus = '".$this->paymentStatus."',
						trackingDetails = '".$this->trackingDetails."',
						proCoinsUsed = '".$this->proCoinsUsed."',
						couponUsed = '".$this->couponUsed."',
						txnId = '".$this->txnId."'
                    WHERE 
                        order_id =".$this->order_id."";
            $stmt = $this->conn->prepare($sqlQuery);
        
            if($stmt->execute()){
                
            if($stat_ == 'Paid'){
                $dt = date("d M Y");
                
                if($couponUsed_ != 'empty')
                {
                     $cnt1 = "You have won ProCoins";
                    $rewardQuery = "INSERT INTO `rewards` (`title`,`amount`, `isRedeemed`,`clientId`) VALUES ('$cnt1','25', 'false','$cId')";   
                    $st1 = $this->conn->prepare($rewardQuery);
                    $st1->execute();
                    
                    $cnt2 = "Received for order : ".$oId;
                    $proCoinTxnQuery = "INSERT INTO `procointransaction` (`txnId`, `des`, `amount`, `creditDebit`, `txnDate`, `clientId`) VALUES ('$txn_', '$cnt2', '25', '1', '$dt', '$cId')";
                    $st2 = $this->conn->prepare($proCoinTxnQuery);
                    $st2->execute();
                }
               
                
               
                
                if($coinUsed_ > 0 ){
                    $cnt3 = "Used for order : ".$oId;
                    $proCoinTxnQuery2 = "INSERT INTO `procointransaction` (`txnId`, `des`, `amount`, `creditDebit`, `txnDate`, `clientId`) VALUES ('$txn_', '$cnt3', '$coinUsed_', '2', '$dt', '$cId')";
                    $st3 = $this->conn->prepare($proCoinTxnQuery2);
                    $st3->execute();    
                }
                
                $status_ = $this->status;
                $orderId_ = $this->order_id;
    		    
    		    
    		    
    		    
    		    $qry = "select c.name AS custName,o.img,o.amount,o.name from orders o JOIN client c ON c.id = o.clientId WHERE o.order_id = ".$this->order_id."";
                $qry_st = $this->conn->prepare($qry);
                $qry_st->execute();
                $qry_row = $qry_st->fetch(PDO::FETCH_ASSOC);
                
                $img = $qry_row['img'];
                $productName = $qry_row['name'];
                $custName = $qry_row['custName'];
                $title = $custName." placed new order";
                $body = $productName." : Rs.".$qry_row['amount']."/-";
                
                $qryAdmin = "select f.token from fcmToken f join client c on c.mobile = f.mobile join orders o on o.clientId = c.id where c.mobile = '8796655176' ORDER BY f.id DESC LIMIT 1";
               
                $qryAdmin_st = $this->conn->prepare($qryAdmin);
                $qryAdmin_st->execute();
                $qryAdmin_row = $qryAdmin_st->fetch(PDO::FETCH_ASSOC);
                $key = $qryAdmin_row['token'];
                $this->sendFCM($title,$body,$img,$key);
                
                
            }
            
               return true;
            }
            return false;
        }
        
        function getMaxId()
		{
			$sqlQuery = "SELECT max(order_id) as order_id FROM " . $this->db_table . "";
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
		}
		
	


		function updateOrderStatus(){
		    
		    $status_ = $this->status;
            $orderId_ = $this->order_id;
		    
		    $qry = "select f.token,o.img,o.name from fcmToken f join client c on c.mobile = f.mobile join orders o on o.clientId = c.id where o.order_id = ".$orderId_." order by f.id desc limit 1";
		  
            $qry_st = $this->conn->prepare($qry);
            $qry_st->execute();
            $qry_row = $qry_st->fetch(PDO::FETCH_ASSOC);
            $key = $qry_row['token'];
		    $img = $qry_row['img'];
		    
		    $title = '';
		    $body = '';
		    if($status_ == 'Shipped' || $status_ == 'Delivered')
		    {
            $title = "Your order has been ".$status_."";
            $body = "Order:".$orderId_." , Product: ".$qry_row['name']." updates...";
		    }
            else 
            {
                $title = "Oops , your order has been cancelled !!!";
                $body = "Contact support in app for more details";
            }
            
		    $this->sendFCM($title,$body,$img,$key);
		    
            $sqlQuery = "update orders set status = '".$status_."' where order_id = ".$orderId_;
            $stmt = $this->conn->prepare($sqlQuery);
            $stmt->execute();
            return $stmt;
		}
       

    }
?>

