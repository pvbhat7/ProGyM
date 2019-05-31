package com.progym.pvbhat7.progymfinal;

import android.app.Fragment;
import android.content.Context;
import android.os.Bundle;
import android.os.Handler;
import android.support.v4.view.ViewPager;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;

import com.squareup.picasso.MemoryPolicy;
import com.squareup.picasso.Picasso;

import java.util.ArrayList;
import java.util.Timer;
import java.util.TimerTask;

import me.relex.circleindicator.CircleIndicator;

public class GamesFragment extends Fragment {
    public Session session;
    private static ViewPager mPager;
    private static int currentPage = 0;
    private static final Integer[] XMEN= {R.drawable.nk,R.drawable.aluadv,R.drawable.pva,R.drawable.amol_adv};
    private ArrayList<Integer> XMENArray = new ArrayList<Integer>();
    int count=0;

    View rootView;

    Context context;
    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {


        rootView = inflater.inflate(R.layout.fragment_games, container, false);
        //ImageView imageView1 = (ImageView) rootView.findViewById(R.id.advertisement);


        /*****   THIS CODE REFERS TO ONLINE IMAGE UPLOAD ADVERTISEMENTS  ****
*/
        ImageView imageView3 = (ImageView) rootView.findViewById(R.id.image_g3);
        context=getActivity();
        session = new Session(context);
        //String advFlag=session.getadvFlag();

        int countfromsession=session.getCount();
        count=getCount(countfromsession);

        if(count!=1)
        {
           // picaso(count,imageView3,container);
        }

        init();
        /*

        ADVERTISE MENT CODE OF PRASHANT BHAT

        if(advFlag.equalsIgnoreCase("true")){

            imageView1.setBackgroundResource(R.drawable.nk);
            session.setadvFlag("false");
        }
        else if(advFlag.equalsIgnoreCase("false")){
            imageView1.setBackgroundResource(R.drawable.aluadv);
            session.setadvFlag("true");
        }*/


       /* ImageView imageView1 = (ImageView) rootView.findViewById(R.id.image_g1);
        ImageView imageView2 = (ImageView) rootView.findViewById(R.id.image_g2);*/

        /*Picasso.with(container.getContext())
                .load("https://scontent.fblr4-1.fna.fbcdn.net/v/t1.0-9/21687512_1697687780265386_6293738714158025667_n.jpg?oh=fb21769c7432c7b0a4e08774a2c814e6&oe=5A5E2097")
                .placeholder(R.drawable.load)   // optional
                .error(R.drawable.banner1)      // optional
                *//*.resize(2100,800)                        // optional*//*
                .into(imageView1);

        Picasso.with(container.getContext())
                .load("https://scontent.fblr4-1.fna.fbcdn.net/v/t1.0-9/21766557_1698082966892534_4021425319178993415_n.jpg?oh=0aa1212fa9e89ce821131cef2841f345&oe=5A569646")
                .placeholder(R.drawable.load)   // optional
                .error(R.drawable.banner2)      // optional
                *//*.resize(2100,800)                        // optional*//*
                .into(imageView2);
*/

        /*Picasso.with(container.getContext())
                .load("https://progym007.000webhostapp.com/images/"+count+".jpg")
                .placeholder(R.drawable.load)   // optional
                .error(R.drawable.banner3_a)
                .memoryPolicy(MemoryPolicy.NO_CACHE).// optional
                into(imageView3);*/


        return rootView;
    }

    private void picaso(int count, ImageView imageView3, ViewGroup container) {

        Picasso.with(container.getContext())
                .load("https://progym007.000webhostapp.com/images/"+count+".jpg")
                .placeholder(R.drawable.load)
                .memoryPolicy(MemoryPolicy.NO_CACHE)// optional
                .error(R.drawable.banner3_a)      // optional
                .into(imageView3);
    }


    private int getCount(int count) {

        if(count==0)
        {
            session.setCount(1);
            return 1;
        }
        else if(count==1)
        {
            session.setCount(2);
            return 2;
        }
        else if(count==2)
        {

            session.setCount(3);
            return 3;

        }else if(count==3)
        {

            session.setCount(4);
            return 4;
        }
        session.setCount(1);
        return 1;
    }

    private void init() {
        for(int i=0;i<XMEN.length;i++)
            XMENArray.add(XMEN[i]);

        mPager = (ViewPager) rootView.findViewById(R.id.pager);
        mPager.setAdapter(new MyAdapter(context,XMENArray));
        CircleIndicator indicator = (CircleIndicator) rootView.findViewById(R.id.indicator);
        indicator.setViewPager(mPager);

        // Auto start of viewpager
        final Handler handler = new Handler();
        final Runnable Update = new Runnable() {
            public void run() {
                if (currentPage == XMEN.length) {
                    currentPage = 0;
                }
                mPager.setCurrentItem(currentPage++, true);
            }
        };
        Timer swipeTimer = new Timer();
        swipeTimer.schedule(new TimerTask() {
            @Override
            public void run() {
                handler.post(Update);
            }
        }, 3500, 3500);
    }

}