<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: POST");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

    include_once '../../config/database.php';
	include_once '../../class/rewards.php';

    $database = new Database();
    $db = $database->getConnection();

    $item = new Rewards($db);

    $data = json_decode(file_get_contents("php://input"));

            $item->title= $data->title;
            $item->subTitle= $data->subTitle;
			$item->img= $data->img;
			$item->amount= $data->amount;
			$item->isRedeemed= $data->isRedeemed;
			$item->creditDebit= $data->creditDebit;
			$item->clientId= $data->clientId;
			$item->redeemDate= $data->redeemDate;
			
    $resultId = $item->createRewardsFromApp();
    echo $resultId;
    return $resultId;
	
	
	//echo $item->createClient();
	
?>