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

$sql = "SELECT coupon,email FROM Coupons";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    // output data of each row
    while($row = $result->fetch_assoc()) {
        echo "coupon: " . $row["coupon"]. " - Email: " . $row["email"]. "<br>";
    }
} else {
    echo "0 results";
}
$conn->close();

    echo '</br></br><a href="admin.php">admin home</a>';
?>