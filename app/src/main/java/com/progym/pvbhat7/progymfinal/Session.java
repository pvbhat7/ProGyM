package com.progym.pvbhat7.progymfinal;

import android.content.Context;
import android.content.SharedPreferences;
import android.preference.PreferenceManager;

/**
 * Created by pvbhat7 on 10/29/2017.
 */

public class Session {

    private SharedPreferences prefs;

    public Session(Context cntx) {
        // TODO Auto-generated constructor stub
        prefs = PreferenceManager.getDefaultSharedPreferences(cntx);
    }

    public void setName(String name) {
        prefs.edit().putString("name", name).commit();
        //prefsCommit();
    }

    public String getName() {
        String name = prefs.getString("name","");
        return name;
    }

    public void setFlag(String flag) {
        prefs.edit().putString("flag", flag).commit();
        //prefsCommit();
    }

    public String getFlag() {
        String flag = prefs.getString("flag","");
        return flag;
    }

    public void setMobile(String mobile) {
        prefs.edit().putString("mobile", mobile).commit();
        //prefsCommit();
    }

    public String getMobile() {
        String mobile = prefs.getString("mobile","");
        return mobile;
    }

    public void setEmail(String email) {
        prefs.edit().putString("email", email).commit();
        //prefsCommit();
    }

    public String getEmail() {
        String email = prefs.getString("email","");
        return email;
    }


    public void setWalletMoney(String walletMoney) {
        prefs.edit().putString("walletMoney", walletMoney).commit();
        //prefsCommit();
    }

    public String getWalletMoney() {
        String walletMoney = prefs.getString("walletMoney","false");
        return walletMoney;
    }

    public void setCoupon(String coupon) {
        prefs.edit().putString("coupon",coupon).commit();
        //prefsCommit();
    }

    public String getcoupon() {
        String coupon = prefs.getString("coupon","");
        return coupon;
    }

    public void setcouponFlag(String couponFlag) {
        prefs.edit().putString("couponFlag",couponFlag).commit();
        //prefsCommit();
    }

    public String getcouponFlag() {
        String couponFlag = prefs.getString("couponFlag","false");
        return couponFlag;
    }

    public void setadvFlag(String advFlag) {
        prefs.edit().putString("advFlag",advFlag).commit();
        //prefsCommit();
    }

    public String getadvFlag() {
        String advFlag = prefs.getString("advFlag","left");
        return advFlag;
    }

    public void setCount(int Count) {
        prefs.edit().putInt("Count",Count).commit();
        //prefsCommit();
    }

    public int getCount() {
        int Count = prefs.getInt("Count",1);
        return Count;
    }

    public void setColorNo(int ColorNo) {
        prefs.edit().putInt("ColorNo",ColorNo).commit();
        //prefsCommit();
    }

    public int getColorNo() {
        int ColorNo = prefs.getInt("ColorNo",0);
        return ColorNo;
    }

    public void setJSONcheck(int JSONcheck) {
        prefs.edit().putInt("JSONcheck",JSONcheck).commit();
        //prefsCommit();
    }

    public int getJSONcheck() {
        int JSONcheck = prefs.getInt("JSONcheck",0);
        return JSONcheck;
    }

    public void setReferralCode(String ReferralCode) {
        prefs.edit().putString("ReferralCode",ReferralCode).commit();
        //prefsCommit();
    }

    public String getReferralCode() {
        String ReferralCode = prefs.getString("ReferralCode","*****");
        return ReferralCode;
    }
    public void setInputReferralCode(String InputReferralCode) {
        prefs.edit().putString("InputReferralCode",InputReferralCode).commit();
        //prefsCommit();
    }

    public String getInputReferralCode() {
        String InputReferralCode = prefs.getString("InputReferralCode","*****");
        return InputReferralCode;
    }





}
