package com.progym.pvbhat7.progymfinal;

/**
 * Created by pvbhat7 on 10/28/2017.
 */

public class User
{

    private int id;
    private String email,password,walletMoney,status,referralcode;

    public User()
    {

    }

    public User(int id, String email, String password, String walletMoney, String status, String referralcode) {
        this.id = id;
        this.email = email;
        this.password = password;
        this.walletMoney = walletMoney;
        this.status = status;
        this.referralcode = referralcode;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getWalletMoney() {
        return walletMoney;
    }

    public void setWalletMoney(String walletMoney) {
        this.walletMoney = walletMoney;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getReferralcode() {
        return referralcode;
    }

    public void setReferralcode(String referralcode) {
        this.referralcode = referralcode;
    }
}
