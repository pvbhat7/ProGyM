package com.progym.pvbhat7.progymfinal;


import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentStatePagerAdapter;

public class PagerAdapter_shoulder extends FragmentStatePagerAdapter {
    int mNumOfTabs;

    public PagerAdapter_shoulder(FragmentManager fm, int NumOfTabs) {
        super(fm);
        this.mNumOfTabs = NumOfTabs;
    }

    @Override
    public Fragment getItem(int position) {

        switch (position) {

            case 0:
                SHOULDER_military_press o1 = new SHOULDER_military_press();
                return o1;
            case 1:
                SHOULDER_seated_press_machine o2 = new SHOULDER_seated_press_machine();
                return o2;
            case 2:
                SHOULDER_cable_front_raise o3 = new SHOULDER_cable_front_raise();
                return o3;
            case 3:
                SHOULDER_dumbell_front_raise o4 = new SHOULDER_dumbell_front_raise();
                return o4;
            case 4:
                SHOULDER_dumbell_lataral_raise o5 = new SHOULDER_dumbell_lataral_raise();
                return o5;

            case 5:
                SHOULDER_shoulder_shrug o6 = new SHOULDER_shoulder_shrug();
                return o6;

            default:
                return null;
        }
    }

    @Override
    public int getCount() {
        return mNumOfTabs;
    }
}