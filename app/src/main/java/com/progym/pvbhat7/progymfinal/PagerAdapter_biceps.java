package com.progym.pvbhat7.progymfinal;


import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentStatePagerAdapter;

public class PagerAdapter_biceps extends FragmentStatePagerAdapter {
    int mNumOfTabs;

    public PagerAdapter_biceps(FragmentManager fm, int NumOfTabs) {
        super(fm);
        this.mNumOfTabs = NumOfTabs;
    }

    @Override
    public Fragment getItem(int position) {

        switch (position) {

            case 0:
                BICEPS_biceps_curls o1 = new BICEPS_biceps_curls();
                return o1;
            case 1:
                BICEPS_chin_ups o2 = new BICEPS_chin_ups();
                return o2;
            case 2:
                BICEPS_concentration_curls o3 = new BICEPS_concentration_curls();
                return o3;
            case 3:
                BICEPS_dumbell_curls o4 = new BICEPS_dumbell_curls();
                return o4;
            case 4:
                BICEPS_hammer_curls o5 = new BICEPS_hammer_curls();
                return o5;

            case 5:
                BICEPS_incline_dumbell_curls o6 = new BICEPS_incline_dumbell_curls();
                return o6;

            case 6:
                BICEPS_preacher_curls o7 = new BICEPS_preacher_curls();
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