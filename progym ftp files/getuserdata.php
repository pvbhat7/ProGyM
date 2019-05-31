<?php
   $con=mysqli_connect("localhost","id3357824_username","password","id3357824_my_db");

   if (mysqli_connect_errno($con)) {
      echo "Failed to connect to MySQL: " . mysqli_connect_error();
   }

   $email = $_POST['email'];
   $result = mysqli_query($con,"SELECT * FROM table1");
   $row = mysqli_fetch_array($result);
   $data = $row[0];

   if($data){
      echo "Prashant";
   }
   mysqli_close($con);
?>