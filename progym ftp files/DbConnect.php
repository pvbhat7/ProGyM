<?php 
 
 /*
 * Created by Belal Khan
 * website: www.simplifiedcoding.net 
 */
 
 //Class DbConnect
 class DbConnect
 {
 //Variable to store database link
 private $con;
 
 //Class constructor
 function __construct()
 {
 
 }
 
 //This method will connect to the database
 function connect()
 {
  
 //connecting to mysql database
 $this->con = new mysqli("localhost","id3357824_username","password","id3357824_my_db");
 
 //Checking if any error occured while connecting
 if (mysqli_connect_errno()) {
 echo "Failed to connect to MySQL: " . mysqli_connect_error();
 }
 
 //finally returning the connection link 
 return $this->con;
 }
 
 }