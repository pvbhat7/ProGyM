<?php
 
class DbOperation
{
    //Database connection link
    private $con;
 
    //Class constructor
    function __construct()
    {
        //Getting the DbConnect.php file
        require_once dirname(__FILE__) . '/DbConnect.php';
 
        //Creating a DbConnect object to connect to the database
        $db = new DbConnect();
 
        //Initializing our connection link of this class
        //by calling the method connect of DbConnect class
        $this->con = $db->connect();
    }

 /*
 Create user
 */
 
 function createUser($email, $password, $walletmoney, $status, $referralcode){
     
 $stmt = $this->con->prepare("INSERT INTO Users (email, password,walletmoney,status,referralcode) VALUES (?, ?, ?, ?, ?)");
 $stmt->bind_param("sssss",$email,$password,$walletmoney,$status,$referralcode);
 if($stmt->execute())
 return true; 
 return false; 
 }
 
 /*
 Create progym wall message
 */
 
 function createMessage($email,$message){
     
 $stmt = $this->con->prepare("INSERT INTO progymwall (email,message) VALUES (?, ?)");
 $stmt->bind_param("ss",$email,$message);
 if($stmt->execute())
 return true; 
 return false; 
 }
  /*
 Create Coupon
 */
 
 function createCoupon($coupon, $email){
     
 $stmt = $this->con->prepare("INSERT INTO Coupons (coupon,email) VALUES (?, ?)");
 $stmt->bind_param("ss",$coupon,$email);
 if($stmt->execute())
 return true; 
 return false; 
 }

 
 /*
 * The create operation
 * When this method is called a new record is created in the database
 */
 function createHero($name, $realname, $rating, $teamaffiliation){
 $stmt = $this->con->prepare("INSERT INTO heroes (name, realname, rating, teamaffiliation) VALUES (?, ?, ?, ?)");
 $stmt->bind_param("ssis", $name, $realname, $rating, $teamaffiliation);
 if($stmt->execute())
 return true; 
 return false; 
 }
 
 //add referral map entry
 function createReferralEntry($email, $referralCode,$deviceId){
 $stmt = $this->con->prepare("INSERT INTO referralEntry (r_email,referralCode,deviceId) VALUES (?, ?, ?)");
 $stmt->bind_param("sss", $email,$referralCode,$deviceId);
 if($stmt->execute())
 return true; 
 return false; 
 }
 
 
 /*
 * The read operation
 * When this method is called it is returning all the existing record of the database
 */
 function getHeroes()
 {
 $stmt = $this->con->prepare("SELECT id, name, realname, rating, teamaffiliation FROM heroes");
 $stmt->execute();
 $stmt->bind_result($id, $name, $realname, $rating, $teamaffiliation);
 
 $heroes = array(); 
 
 while($stmt->fetch()){
 $hero  = array();
 $hero['id'] = $id; 
 $hero['name'] = $name; 
 $hero['realname'] = $realname; 
 $hero['rating'] = $rating; 
 $hero['teamaffiliation'] = $teamaffiliation; 
 
 array_push($heroes, $hero); 
 }
 
 return $heroes; 
 }
 
 /*
 * The read operation
 * this method is for getting all progym wall messages
 */
 function getMessages(){
 $stmt = $this->con->prepare("SELECT id, email, message FROM progymwall");
 $stmt->execute();
 $stmt->bind_result($id, $email, $msg);
 
 $messages = array(); 
 
 while($stmt->fetch()){
 $message  = array();
 $message['id'] = $id; 
 $message['email'] = $email; 
 $message['message'] = $msg; 
 
 array_push($messages, $message); 
 }
 
 return $messages; 
 }
 
  /*
 * The getuserdata operation
 * 
 */
 function getUserProfile($email){
$stmt = $this->con->prepare("SELECT id, email, password, walletmoney, status ,referralcode FROM Users where email= ?");
 $stmt->bind_param("s", $email);
 $stmt->execute();
 $stmt->bind_result($id, $email, $password, $walletmoney, $status, $referralcode);
 
 $users = array(); 
 
 while($stmt->fetch()){
 $user  = array();
 $user['id'] = $id; 
 $user['email'] = $email; 
 $user['password'] = $password; 
 $user['walletmoney'] = $walletmoney; 
 $user['status'] = $status; 
 $user['referralcode'] = $referralcode; 
 
 array_push($users, $user); 
 }
 
 return $user; 
 }
 
 /*
 * The getCouponDetails operation
 * 
 */
 function getCouponDetails($email){
$stmt = $this->con->prepare("SELECT referralcode,walletmoney FROM Users where email= ?");
 $stmt->bind_param("s", $email);
 $stmt->execute();
 $stmt->bind_result($referralcode, $walletmoney);
 
 
 $coupon  = array();
 $coupon['referralcode'] = $referralcode; 
 $coupon['walletmoney'] = $walletmoney; 
 
 
 return $coupon; 
 }
 
 /*
 * The update operation
 * When this method is called the record with the given id is updated with the new given values
 */
 function updateHero($id, $name, $realname, $rating, $teamaffiliation){
 $stmt = $this->con->prepare("UPDATE heroes SET name = ?, realname = ?, rating = ?, teamaffiliation = ? WHERE id = ?");
 $stmt->bind_param("ssisi", $name, $realname, $rating, $teamaffiliation, $id);
 if($stmt->execute())
 return true; 
 return false; 
 }
 
 
 
 
 /*
 * The delete operation
 * When this method is called record is deleted for the given id 
 */
 function deleteHero($id){
 $stmt = $this->con->prepare("DELETE FROM heroes WHERE id = ? ");
 $stmt->bind_param("i", $id);
 if($stmt->execute())
 return true; 
 
 return false; 
 }
}