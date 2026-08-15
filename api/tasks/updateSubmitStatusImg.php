<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
    include_once '../../class/tasks.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new tasks($db);
    

    $data = json_decode(file_get_contents("php://input"));

            $item->id= $data->id;
			$item->submitImg= $data->submitImg;
		
			
    $b64 = $data->submitImg;
    if($b64 != ''){
        $id_ = $data->clientId;
        $bin = base64_decode($b64);
        $im = imageCreateFromString($bin);
        if (!$im) {
          die('Base64 value is not a valid image');
        }
        $rnd = rand(10,100);
        $fName = $data->id.$rnd.".png";
        $img_file = '../../../task_submit_imgs/'.$fName;
        
        imagepng($im, $img_file, 0);
        $tavrosImagePath = 'https://tavrostechinfo.com/PROGYM/task_submit_imgs/'.$fName;
        $item->submitImg= $tavrosImagePath;
    }
    else{
        $item->submitImg= $data->submitImg;
    }
	
	
	
			
     $item->updateSubmitStatusImg();
	
?>