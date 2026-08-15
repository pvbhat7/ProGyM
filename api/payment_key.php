<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
  
    // progym key
    echo json_encode(array("result" =>  'rzp_live_4Vo1fAmkG3I8y7'));
    
    // tavros key
	//echo json_encode(array("result" =>  'rzp_test_fOl4hWRQUDDs5J'));
	
	
?>