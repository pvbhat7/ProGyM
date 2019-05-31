<?php
echo '<h2>Remove image page</h2>';
$id = $_GET['id'];


$dirname = "images/";
$images = glob($dirname."*.jpg");
$count=0;
foreach($images as $image) 
{

$count++;
if($count==$id)
{
	unlink($image);
	echo '<h1>Image removed successfully !!!</h1>';
}
    
	
}
echo '<a href="admin.php">Go To admin home</a>';
?>