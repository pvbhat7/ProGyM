<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
    
    include_once '../../config/database.php';
	include_once '../../class/brand_images.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    $item = new brand_images($db);
    
    $data = json_decode(file_get_contents("php://input"));
    
    // employee values
            $item->login_brand_logo= $data->login_brand_logo;
			$item->banner_1= $data->banner_1;
			$item->owner_1= $data->owner_1;
			$item->owner_2= $data->owner_2;
			$item->trainer_1= $data->trainer_1;
			$item->trainer_2= $data->trainer_2;
			$item->appBanner_1= $data->appBanner_1;
			$item->appBanner_2= $data->appBanner_2;
			$item->appBanner_3= $data->appBanner_3;
			$item->appBanner_4= $data->appBanner_4;
			$item->appAdvertise_1= $data->appAdvertise_1;
			$item->appAdvertise_2= $data->appAdvertise_2;
			$item->appAdvertise_3= $data->appAdvertise_3;
			$item->appAdvertise_4= $data->appAdvertise_4;
			$item->appBanner_1Contact= $data->appBanner_1Contact;
			$item->appBanner_2Contact= $data->appBanner_2Contact;
			$item->appBanner_3Contact= $data->appBanner_3Contact;
			$item->appBanner_4Contact= $data->appBanner_4Contact;
			$item->appAdvertise_1Contact= $data->appAdvertise_1Contact;
			$item->appAdvertise_2Contact= $data->appAdvertise_2Contact;
			$item->appAdvertise_3Contact= $data->appAdvertise_3Contact;
			$item->appAdvertise_4Contact= $data->appAdvertise_4Contact;
			$item->h1= $data->h1;
			$item->h2= $data->h2;
			$item->h3= $data->h3;
			$item->h4= $data->h4;
			$item->h5= $data->h5;
			$item->upgradePlan1_img= $data->upgradePlan1_img;
			$item->upgradePlan2_img= $data->upgradePlan2_img;
			$item->upgradePlan3_img= $data->upgradePlan3_img;

			    
    if($item->updateBrandImages()){
        echo json_encode("Employee data updated.");
    } else{
        echo json_encode("Data could not be updated");
    }
?>