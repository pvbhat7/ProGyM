<?php
header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

$data = json_decode(file_get_contents("php://input"));

$b64 = $data->img;
$bin = base64_decode($b64);
$im = imageCreateFromString($bin);
if (!$im) {
  die('Base64 value is not a valid image');
  echo 'error';
}
$img_file = 'img/filename.png';
imagepng($im, $img_file, 0);
echo 'success';
?>