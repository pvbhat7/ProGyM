package com.progym.pvbhat7.progymfinal;


import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentStatePagerAdapter;

public class PagerAdapter_squats extends FragmentStatePagerAdapter {
    int mNumOfTabs;

    public PagerAdapter_squats(FragmentManager fm, int NumOfTabs) {
        super(fm);
        this.mNumOfTabs = NumOfTabs;
    }

    @Override
    public Fragment getItem(int position) {

        switch (position) {

            case 0:
                SQUATS_barbell_squats o1 = new SQUATS_barbell_squats();
                return o1;
            case 1:
                SQUATS_deadlift o2 = new SQUATS_deadlift();
                return o2;
            case 2:
                SQUATS_calf_raise o3 = new SQUATS_calf_raise();
                return o3;
            case 3:
                SQUATS_leg_press o4 = new SQUATS_leg_press();
                return o4;
            case 4:
                SQUATS_leg_extention o5 = new SQUATS_leg_extention();
                return o5;

            case 5:
                SQUATS_back_leg_extention o6 = new SQUATS_back_leg_extention();
                return o6;

            case 6:
                SQUATS_squats o7 = new SQUATS_squats();
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