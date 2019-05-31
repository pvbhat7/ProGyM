package com.progym.pvbhat7.progymfinal;

/**
 * Created by pvbhat7 on 10/27/2017.
 */

public class Api {

    private static final String ROOT_URL = "https://progym007.000webhostapp.com/Api.php?apicall=";

    public static final String URL_CREATE_HERO = ROOT_URL + "createhero";
    public static final String URL_READ_HEROES = ROOT_URL + "getheroes";
    public static final String URL_UPDATE_HERO = ROOT_URL + "updatehero";
    public static final String URL_DELETE_HERO = ROOT_URL + "deletehero&id=";
    public static final String URL_CREATE_USER = ROOT_URL + "createUser";
    public static final String URL_READ_USER_PROFILE = ROOT_URL + "ReadUserProfile&email=";
    public static final String URL_UPLOAD_COUPON_DETAILS = ROOT_URL + "UploadCouponDetails";
    public static final String URL_ADD_REFERRAL_ENTRY=ROOT_URL+"addReferralEntry";
    public static final String URL_READ_COUPON_DETAILS=ROOT_URL+"readCouponDetails";
    public static final String URL_CREATE_WALL_MESSAGE=ROOT_URL+"createMessage";
    public static final String URL_READ_WALL_MESSAGES=ROOT_URL+"getmessages";
    public static final String URL_READ_UPDATE_FLAG = "getUpdateFlag";

}
