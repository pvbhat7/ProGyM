<?php
    header("Access-Control-Allow-Origin: *");
    header("Content-Type: application/json; charset=UTF-8");
    header("Access-Control-Allow-Methods: GET");
    header("Access-Control-Max-Age: 3600");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");


	$objArray []= '';
	
	$objArray[0] = array(
		    "key0" =>  'Pranav Patil',
             "key1" =>  'patilpranav77d@gmail.com'
            );
            
    $objArray[1] = array(
		    "key0" =>  'Snehal Patil',
             "key1" =>  'snehal.desai911@gmail.com'
            );
            

    $objArray[2] = array(
		    "key0" =>  'Prashant Bhat',
             "key1" =>  'bhatprashant1994@gmail.com'
            );
            
    $objArray[3] = array(
		    "key0" =>  'Yash Patil',
             "key1" =>  'patilyash4758@gmail.com'
            );
            
            echo json_encode($objArray);
		
?>