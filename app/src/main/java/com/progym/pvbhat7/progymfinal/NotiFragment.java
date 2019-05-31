package com.progym.pvbhat7.progymfinal;

import android.app.Fragment;
import android.content.Intent;
import android.graphics.Color;
import android.os.AsyncTask;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;

import static android.view.View.GONE;

public class NotiFragment extends Fragment {
    String []ColorNo={"#00FF00","#0000FF","#88F4E9","#FFF700","#FF0000","#C500FF","#00E4FF","#FF00B6"};
    LinearLayout linearLayout;
    private FirebaseAuth.AuthStateListener authListener;
    private FirebaseAuth auth;
    String cur_email,message;
    EditText inputMessage;
    private static final int CODE_POST_REQUEST = 1025;
    private static final int CODE_GET_REQUEST = 1024;
    HashMap<String, String> params=null;
    public Session session;
    String direction;
    int JSONcheck;
    JSONObject object=null;
    private WebView webView;
    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        /*auth = FirebaseAuth.getInstance();
        session = new Session(getActivity());
        direction=session.getadvFlag();
        JSONcheck=session.getJSONcheck();
        //get current user
        final FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        cur_email=user.getEmail();*/

        View rootView = inflater.inflate(R.layout.fragment_noti, container, false);
        webView=(WebView)rootView.findViewById(R.id.webView);
        webView.setWebViewClient(new WebViewClient());
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        webView.loadUrl("https://progym007.000webhostapp.com/gymadmin/adminlogin.php");


        /*if(JSONcheck==0)
        {
            getUpdatedMessages();
            session.setJSONcheck(1);
        }
        else
        {
            *//*while(object.length()>0)
                object.remove(object.keys().next());*//*
            getUpdatedMessages();

        }

        linearLayout = (LinearLayout) rootView.findViewById(R.id.noti_linear_layout);
        Button sendmessagebtn = (Button) rootView.findViewById(R.id.sendmessagebtn);
        inputMessage = (EditText) rootView.findViewById(R.id.inputtext);

        sendmessagebtn.setOnClickListener(new View.OnClickListener()
        {
            @Override
            public void onClick(View v)
            {



                message = inputMessage.getText().toString().trim();
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

                textView2.setText(""+cur_email+" \n "+message+"");
                textView2.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
                int no=session.getJSONcheck();
                if(no==7)
                {
                    session.setJSONcheck(0);
                    int color=Color.parseColor(ColorNo[0]);
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

                // UPDATE MESSAGE DATABASE
                params = new HashMap<>();
                params.put("email",cur_email);
                params.put("message",message);
                updateMessageDatabase(params);
                //getUpdatedMessages();

            }
        });
        // Add textview 1
        TextView textView1 = new TextView(getActivity());
        textView1.setLayoutParams(new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT));
        textView1.setText("** ProGym Wall **");
        int no=session.getJSONcheck();
        if(no==7)
        {
            session.setJSONcheck(0);
            int color=Color.parseColor(ColorNo[0]);
            textView1.setBackgroundColor(color); // hex color 0xAARRGGBB
            session.setJSONcheck(session.getJSONcheck()+1);
        }
        else
        {
            int color=Color.parseColor(ColorNo[no]);
            textView1.setBackgroundColor(color); // hex color 0xAARRGGBB
            session.setJSONcheck(session.getJSONcheck()+1);
        }
        textView1.setPadding(20, 130, 20, 20);// in pixels (left, top, right, bottom)
        linearLayout.addView(textView1);

        // Add textview 2*/


        return rootView;
    }

    private void updateMessageDatabase(HashMap<String, String> params) {
        PerformNetworkRequest request = new PerformNetworkRequest(Api.URL_CREATE_WALL_MESSAGE, params, CODE_POST_REQUEST);
        request.execute();
    }// end update message database
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



                    //JSONObject obj = object.getJSONObject("messages");
                    JSONArray array = object.getJSONArray("messages");
                    for(int i=0;i<array.length();i++)
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
                            int color=Color.parseColor(ColorNo[0]);
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
                    }

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

    private void getUpdatedMessages()
    {

        PerformNetworkRequest requestM = new PerformNetworkRequest(Api.URL_READ_WALL_MESSAGES, null, CODE_GET_REQUEST);
        requestM.execute();

    }//end getupdate message



}