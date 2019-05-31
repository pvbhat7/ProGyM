package com.progym.pvbhat7.progymfinal;


import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentStatePagerAdapter;

public class PagerAdapter_chest extends FragmentStatePagerAdapter {
    int mNumOfTabs;

    public PagerAdapter_chest(FragmentManager fm, int NumOfTabs) {
        super(fm);
        this.mNumOfTabs = NumOfTabs;
    }

    @Override
    public Fragment getItem(int position) {

        switch (position) {

            case 0:
                CHEST_flat_bench_press o1 = new CHEST_flat_bench_press();
                return o1;
            case 1:
                CHEST_incline_bench_press o2 = new CHEST_incline_bench_press();
                return o2;
            case 2:
                CHEST_decline_dumbell_press o3 = new CHEST_decline_dumbell_press();
                return o3;
            case 3:
                CHEST_dumbell_press o4 = new CHEST_dumbell_press();
                return o4;
            case 4:
                CHEST_incline_dumbell_fly o5 = new CHEST_incline_dumbell_fly();
                return o5;

            case 5:
                CHEST_dumbell_bent_and_pullover o6 = new CHEST_dumbell_bent_and_pullover();
                return o6;

            case 6:
                CHEST_chest_dips o7 = new CHEST_chest_dips();
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