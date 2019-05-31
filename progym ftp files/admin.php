<?php
echo '<h2>ADVERTISEMENTS ADMIN HOME</h2></br>';

echo '<a href="uploadphoto.php">Upload New Advertise</a></br></br>';

echo '<a href="allcoupons.php">view all coupons</a></br>';

$dirname = "images/";
$images = glob($dirname."*.jpg");
$count=1;
echo '</br></br></br>';
foreach($images as $image) 
{
    echo $count;
    echo '&nbsp;&nbsp;&nbsp;<img width="250" height="100" src="'.$image.'" />';
    echo '&nbsp;&nbsp;&nbsp;<a href="removeimage.php?id='.$count.'">Remove</a></br></br>';
    $count++;
}

if($count==1)
{
    echo '<h4>NO ADVERTISEMENTS FOUND</h4>';
}
?>