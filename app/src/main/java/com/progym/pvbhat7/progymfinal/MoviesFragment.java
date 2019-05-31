package com.progym.pvbhat7.progymfinal;

import android.app.Fragment;
import android.content.Intent;
import android.graphics.Color;
import android.os.AsyncTask;
import android.os.Bundle;
import android.support.annotation.NonNull;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.MobileAds;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.squareup.picasso.Picasso;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;

public class MoviesFragment extends Fragment {

    private FirebaseAuth.AuthStateListener authListener;
    private FirebaseAuth auth;
    private AdView mAdView;
    private static final int CODE_POST_REQUEST = 1025;
    private static final int CODE_GET_REQUEST = 1024;
    JSONObject object=null;
    public Session session;
    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // initialize the AdMob app
        //MobileAds.initialize(getActivity(), getString(R.string.admob_app_id));



        auth = FirebaseAuth.getInstance();


        //get current user
        final FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();

        authListener = new FirebaseAuth.AuthStateListener() {
            @Override
            public void onAuthStateChanged(@NonNull FirebaseAuth firebaseAuth) {
                FirebaseUser user = firebaseAuth.getCurrentUser();
                if (user == null) {
                    // user auth state is changed - user is null
                    // launch login activity
                   // startActivity(new Intent(MoviesFragment.this, LoginActivity.class));
                    //finish();
                }
            }
        };

        View rootView = inflater.inflate(R.layout.fragment_movies, container, false);

        mAdView = (AdView) rootView.findViewById(R.id.adView);
        AdRequest adRequest = new AdRequest.Builder()
                .build();
        mAdView.loadAd(adRequest);

        ImageView imageView = (ImageView) rootView.findViewById(R.id.image1);
        //https://progym007.000webhostapp.com/images/'"+count+"'.jpg
        //
        Picasso.with(container.getContext())
                .load("https://scontent.fblr4-1.fna.fbcdn.net/v/t1.0-9/21687512_1697687780265386_6293738714158025667_n.jpg?oh=fb21769c7432c7b0a4e08774a2c814e6&oe=5A5E2097")
                .placeholder(R.drawable.load)   // optional
                .error(R.drawable.sd)      // optional
                .resize(2100,800)                        // optional
                .into(imageView);

       // getUpdateFlag();
        if(object!=null)
        {
            System.out.println("not null");
        }
        else
        {
            System.out.println("null");
        }



        //Button signOut = (Button)rootView.findViewById(R.id.sign_out);
        Button beginner = (Button)rootView.findViewById(R.id.image3);
        Button builder = (Button)rootView.findViewById(R.id.image4);
        Button diet = (Button)rootView.findViewById(R.id.image5);


        Button videobutton = (Button)rootView.findViewById(R.id.videobutton);
        /*signOut.setOnClickListener(new View.OnClickListener()
        {
            @Override
            public void onClick(View v) {
                signOut();
            }
        });*/

        videobutton.setOnClickListener(new View.OnClickListener()
        {
            @Override
            public void onClick(View v)
            {
                Intent myIntent = new Intent(getActivity(),VideosPage.class);
                startActivity(myIntent);
            }
        });
        beginner.setOnClickListener(new View.OnClickListener()
        {
            @Override
            public void onClick(View v)
            {
                Intent myIntent = new Intent(getActivity(),Beginner.class);
                startActivity(myIntent);
            }
        });
        builder.setOnClickListener(new View.OnClickListener()
        {
            @Override
            public void onClick(View v)
            {
                Intent myIntent = new Intent(getActivity(),Builder.class);
                startActivity(myIntent);
            }
        });
        diet.setOnClickListener(new View.OnClickListener()
        {
            @Override
            public void onClick(View v)
            {
                /*Intent myIntent = new Intent(getActivity(),Diet.class);
                startActivity(myIntent);*/
            }
        });

        return rootView;
    }

    private void getUpdateFlag() {
        PerformNetworkRequest requestM = new PerformNetworkRequest(Api.URL_READ_UPDATE_FLAG, null, CODE_GET_REQUEST);
        requestM.execute();
    }

    //sign out method
    public void signOut() {
        auth.signOut();
    }

    class PerformNetworkRequest extends AsyncTask<Void, Void, String> {
        String url;
        HashMap<String, String> params;
        int requestCode;

        PerformNetworkRequest(String url, HashMap<String, String> params, int requestCode) {
            this.url = url;
            this.params = params;
            this.requestCode = requestCode;
        }

        @Override
        protected void onPreExecute() {
            super.onPreExecute();
            //    progressBar.setVisibility(View.VISIBLE);
        }

        @Override
        protected void onPostExecute(String s) {
            super.onPostExecute(s);
            try {
                object = null;
                try {
                    object = new JSONObject(s);
                } catch (JSONException e) {
                    e.printStackTrace();
                }

                if (!object.getBoolean("error")) {



                    //JSONArray singleuser=object.getJSONArray("users");
                    User fetchedUser=null;



                    JSONObject obj = object.getJSONObject("updateflags");
                    //JSONArray array = object.getJSONArray("messages");


                    /*for(int i=0;i<array.length();i++)
                    {
                        JSONObject jObj = array.getJSONObject(i);

                        String f_email= jObj.getString("email").toString();
                        String f_msg= jObj.getString("message").toString();

                        TextView textView2 = new TextView(getActivity());
                        LinearLayout.LayoutParams layoutParams = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT,
                                LinearLayout.LayoutParams.WRAP_CONTENT);
                        if(session.getadvFlag().equalsIgnoreCase("left"))
                        {
                            layoutParams.gravity = Gravity.RIGHT;
                            session.setadvFlag("right");
                        }
                        else
                        {
                            layoutParams.gravity = Gravity.LEFT;
                            session.setadvFlag("left");
                        }

                        layoutParams.setMargins(10, 10, 10, 10); // (left, top, right, bottom)
                        textView2.setLayoutParams(layoutParams);
                        textView2.setText(""+f_email+" \n\n "+f_msg+"");
                        textView2.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
                        int no=session.getJSONcheck();
                        if(no==7)
                        {
                            session.setJSONcheck(0);
                            int color= Color.parseColor(ColorNo[0]);
                            textView2.setBackgroundColor(color); // hex color 0xAARRGGBB
                            session.setJSONcheck(session.getJSONcheck()+1);
                        }
                        else
                        {
                            int color=Color.parseColor(ColorNo[no]);
                            textView2.setBackgroundColor(color); // hex color 0xAARRGGBB
                            session.setJSONcheck(session.getJSONcheck()+1);
                        }

                        linearLayout.addView(textView2);
                    }*/

                    /*fetchedUser = new User(
                            obj.getInt("id"),
                            obj.getString("email"),
                            obj.getString("password"),
                            obj.getString("walletmoney"),
                            obj.getString("status"),
                            obj.getString("referralcode")
                    );

                    String money="Rs. "+fetchedUser.getWalletMoney();
                    session.setWalletMoney(money);
                    session.setReferralCode(fetchedUser.getReferralcode());*/
                    //Toast.makeText(getApplicationContext(), object.getString("message"), Toast.LENGTH_SHORT).show();
                    //refreshSingleUser(object.getJSONArray("users"));
                }
            } catch (JSONException e) {
                //editTextName = (EditText) findViewById(R.id.editTextName);
                //editTextName.setText("error");
                e.printStackTrace();
            }
            //  progressBar.setVisibility(GONE);
            /*try {
                JSONObject object = new JSONObject(s);
                if (!object.getBoolean("error")) {
                    Toast.makeText(getApplicationContext(), object.getString("message"), Toast.LENGTH_SHORT).show();
                    refreshHeroList(object.getJSONArray("heroes"));
                }
            } catch (JSONException e) {
                e.printStackTrace();
            }*/
            //startActivity(new Intent(SignupActivity.this, LoginActivity.class));
        }

        @Override
        protected String doInBackground(Void... voids) {
            RequestHandler requestHandler = new RequestHandler();

            if (requestCode == CODE_POST_REQUEST)
                return requestHandler.sendPostRequest(url, params);


            if (requestCode == CODE_GET_REQUEST)
                return requestHandler.sendGetRequest(url);

            return null;
        }
    }
}