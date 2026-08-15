<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
	include_once '../../class/client.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new Client($db);

    $data = json_decode(file_get_contents("php://input"));

            $item->name= $data->name;
			$item->mobile= $data->mobile;
			$item->email= $data->email;
			$item->height= $data->height;
			$item->gender= $data->gender;
			$item->birthDate= $data->birthDate;
			$item->bloodGroup= $data->bloodGroup;
			$item->address= $data->address;
			$item->weight= $data->weight;
			$item->photo= $data->photo;
			$item->isGymClient= $data->isGymClient;
			
			$b64 = $data->photo;
    if($b64 != ''){
        $id_ = $data->id;
        $name_ = $data->name;
        $bin = base64_decode($b64);
        $im = imageCreateFromString($bin);
        if (!$im) {
          die('Base64 value is not a valid image');
        }
        $fName = $data->id.$data->name.".png";
        $img_file = '../../../profilePictures/'.$fName;
        imagepng($im, $img_file, 0);
        $rnd = rand(10,100);
        $tavrosImagePath = 'https://tavrostechinfo.com/PROGYM/profilePictures/'.$fName."?".$rnd;
        $item->photo= $tavrosImagePath;
    }
    else{
        $item->photo= $data->photo;
    }
			
    
    if($item->createClientFromApp()){
        echo 'Employee created successfully.';
    } else{
        echo 'Employee could not be created.';
    }
	
	
	//echo $item->createClient();
	
?>