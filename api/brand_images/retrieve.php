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

    $stmt = $item->getBrandImages();
	$itemCount = $stmt->rowCount();
	$objArray []= '';
	
	$cnt = 0;
    if($itemCount > 0){
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)){
            extract($row);
           echo json_encode(array(
              "id" => $row[id],
              "login_brand_logo" => $row[login_brand_logo],
              "banner_1" => $row[banner_1],
              "owner_1" => $row[owner_1],
              "owner_2" => $row[owner_2],
              "trainer_1" => $row[trainer_1],
              "trainer_2" => $row[trainer_2],
              "appBanner_1" => $row[appBanner_1],
              "appBanner_2" => $row[appBanner_2],
              "appBanner_3" => $row[appBanner_3],
              "appBanner_4" => $row[appBanner_4],
              "appAdvertise_1" => $row[appAdvertise_1],
              "appAdvertise_2" => $row[appAdvertise_2],
              "appAdvertise_3" => $row[appAdvertise_3],
              "appAdvertise_4" => $row[appAdvertise_4],
              "appBanner_1Contact" => $row[appBanner_1Contact],
              "appBanner_2Contact" => $row[appBanner_2Contact],
              "appBanner_3Contact" => $row[appBanner_3Contact],
              "appBanner_4Contact" => $row[appBanner_4Contact],
              "appAdvertise_1Contact" => $row[appAdvertise_1Contact],
              "appAdvertise_2Contact" => $row[appAdvertise_2Contact],
              "appAdvertise_3Contact" => $row[appAdvertise_3Contact],
              "appAdvertise_4Contact" => $row[appAdvertise_4Contact],
              "h1" => $row[h1],
              "h2" => $row[h2],
              "h3" => $row[h3],
              "h4" => $row[h4],
              "h5" => $row[h5],
              "upgradePlan1_img" => $row[upgradePlan1_img],
              "upgradePlan2_img" => $row[upgradePlan2_img],
              "upgradePlan3_img" => $row[upgradePlan3_img]
           ));
        }
            
    }

    else{
        http_response_code(404);
        echo json_encode(
            array("message" => "No record found.")
        );
    }
			
			
?>