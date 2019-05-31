<?php

$servername = "localhost";
$username = "id3357824_username";
$password = "password";
$dbname = "id3357824_my_db";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);
// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
} 
echo "<h2>**** Referrals entries ***</h2></br>";
$sql = "SELECT referralEntry.r_email,referralEntry.referralCode,Users.email from referralEntry,Users where referralEntry.referralCode=Users.referralcode";
$result = $conn->query($sql);

echo "<table border='1'><thead><tr><td>Email </td><td>Refer code </td><td>Owner email</td></tr></thead><tbody>";

if ($result->num_rows > 0) {
    // output data of each row
    while($row = $result->fetch_assoc()) 
	{
        //echo "Email : " . $row["r_email"]. " <-----> Refer code: " . $row["referralCode"]. " <-----> Owner email : " . $row["email"] ."</br>";
		echo "<tr><td>".$row["r_email"]."</td><td>".$row["referralCode"]."</td><td>".$row["email"]."</td></tr>";
		
    }
    echo "</tbody></table></br></br>";
} else 
{
    echo "0 results";
}
$conn->close();

    echo '<a href="admin.php">admin home</a>';
?>