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
    
			$item->id= $data->id;
			$item->name= $data->name;
			$item->mobile= $data->mobile;
			$item->gender= $data->gender;
			$item->birthDate= $data->birthDate;
			$item->remarks= $data->remarks;
			$item->discontinue= $data->discontinue;
			$item->referPoints= $data->referPoints;
			$item->email= $data->email;
			$item->address= $data->address;
			$item->bloodGroup= $data->bloodGroup;
			$item->occupation= $data->occupation;
			$item->profileActiveFlag= $data->profileActiveFlag;
			$item->photo= $data->photo;
			$item->reference= $data->reference;
			$item->previousGym= $data->previousGym;
			$item->height= $data->height;
			$item->weight= $data->weight;
			$item->adp= $data->adp;
			$item->awp= $data->awp;			
			$item->isPTClient= $data->isPTClient;			
			$item->creationSource= $data->creationSource;	
			$item->isGymClient= $data->isGymClient;	
			
			    
    if($item->updateClient()){
        echo json_encode("Client data updated.");
    } else{
        echo json_encode("Data could not be updated");
    }
?>