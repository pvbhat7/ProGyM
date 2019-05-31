package com.progym.pvbhat7.progymfinal;


import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentStatePagerAdapter;

public class PagerAdapter_triceps extends FragmentStatePagerAdapter {
    int mNumOfTabs;

    public PagerAdapter_triceps(FragmentManager fm, int NumOfTabs) {
        super(fm);
        this.mNumOfTabs = NumOfTabs;
    }

    @Override
    public Fragment getItem(int position) {

        switch (position) {

            case 0:
                TRICEPS_dumbell_extention o1 = new TRICEPS_dumbell_extention();
                return o1;
            case 1:
                TRICEPS_close_grip_bench_press o2 = new TRICEPS_close_grip_bench_press();
                return o2;
            case 2:
                TRICEPS_barbell_tricep_extention o3 = new TRICEPS_barbell_tricep_extention();
                return o3;
            case 3:
                TRICEPS_french_press o4 = new TRICEPS_french_press();
                return o4;
            case 4:
                TRICEPS_cable_triceps_extention o5 = new TRICEPS_cable_triceps_extention();
                return o5;

            case 5:
                TRICEPS_kickback o6 = new TRICEPS_kickback();
                return o6;

            case 6:
                TRICEPS_triceps_squeezing o7 = new TRICEPS_triceps_squeezing();
                return o7;

            default:
                return null;
        }
    }

    @Override
    public int getCount() {
        return mNumOfTabs;
    }
}