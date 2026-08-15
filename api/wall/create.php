<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
	include_once '../../class/wall.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new wall($db);

    $data = json_decode(file_get_contents("php://input"));

            $item->clientId= $data->clientId;
            $item->clientName= $data->clientName;
			$item->clientPhoto= $data->clientPhoto;
			$item->clientMobile= $data->clientMobile;
			$item->clientEmail= $data->clientEmail;
			$item->uploadDate= $data->uploadDate;
			$item->postPhoto= $data->postPhoto;
			$item->isApproved= $data->isApproved;
			$item->hashTag= $data->hashTag;
			
			
    $b64 = $data->postPhoto;
    if($b64 != ''){
        $id_ = $data->clientId;
        $bin = base64_decode($b64);
        $im = imageCreateFromString($bin);
        if (!$im) {
          die('Base64 value is not a valid image');
        }
        $rnd = rand(10,100);
        $fName = $data->id.$rnd.".png";
        $img_file = '../../../wallPhotos/'.$fName;
        
        imagepng($im, $img_file, 0);
        $tavrosImagePath = 'https://tavrostechinfo.com/PROGYM/wallPhotos/'.$fName;
        $item->postPhoto= $tavrosImagePath;
    }
    else{
        $item->postPhoto= $data->postPhoto;
    }
	
	
	
			
    $resultId = $item->create();
    return $resultId;
	
	
	//echo $item->createClient();
	
?>