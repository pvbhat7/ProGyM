package com.progym.pvbhat7.progymfinal;

import android.os.AsyncTask;
import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.List;

public class MyProfileDisplay extends AppCompatActivity
{
    TextView editTextMobile, editTextName, editTextEmail,editTextWalletMOney;
    Button editProfileBtn;
    ProgressBar progressBar;

    List<Hero> heroList;
    private static final int CODE_GET_REQUEST = 1024;
    private static final int CODE_POST_REQUEST = 1025;

    private Session session;//global variable
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_my_profile_display);
        editTextWalletMOney=(TextView) findViewById(R.id.editTextWalletMOney);
        editTextName = (TextView) findViewById(R.id.editTextName);
        editTextMobile = (TextView) findViewById(R.id.editTextMobile);
        editTextEmail = (TextView) findViewById(R.id.editTextEmail);
        editProfileBtn=(Button) findViewById(R.id.editProfile);

        editProfileBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                /*if (isUpdating) {
                    updateHero();
                } else {
                    createHero();
                }*/
            }
        });
        final FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();

        session = new Session(getApplicationContext()); //in oncreate
//and now we set sharedpreference then use this like

        //session.setName("USERNAME");
        //readUserProfile(user.getEmail());


/*        String flag=session.getFlag();
        if(flag.equals("invalid"))
        {
            MainActivity m=new MainActivity();
            m.setData();
            editTextName.setText(session.getName());
            editTextEmail.setText(session.getEmail());
            editTextMobile.setText(session.getMobile());
            editTextWalletMOney.setText(session.getWalletMoney());
        }
        else
        {
            editTextName.setText(session.getName());
            editTextEmail.setText(session.getEmail());
            editTextMobile.setText(session.getMobile());
            editTextWalletMOney.setText(session.getWalletMoney());
        }*/

        editTextName.setText(session.getName());
        editTextEmail.setText(session.getEmail());
        editTextMobile.setText(session.getMobile());
        editTextWalletMOney.setText(session.getWalletMoney());

    }

    private void readUserProfile(String email) {
        PerformNetworkRequest request = new PerformNetworkRequest(Api.URL_READ_USER_PROFILE + email, null, CODE_GET_REQUEST);
        request.execute();
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
            //progressBar.setVisibility(View.VISIBLE);
        }

        @Override
        protected void onPostExecute(String s) {
            super.onPostExecute(s);

            //progressBar.setVisibility(GONE);
            try {
                JSONObject object = new JSONObject(s);

                if (!object.getBoolean("error")) {



                    //JSONArray singleuser=object.getJSONArray("users");
                    User fetchedUser=null;



                        JSONObject obj = object.getJSONObject("users");


//                        fetchedUser = new User(
//                                obj.getInt("id"),
//                                obj.getString("firstname"),
//                                obj.getString("lastname"),
//                                obj.getString("email"),
//                                obj.getString("password"),
//                                obj.getString("mobile"),
//                                obj.getString("walletmoney"),
//                                obj.getString("status")
//                        );
//
//                    String name=fetchedUser.getFirstName()+" "+fetchedUser.getLastName();
//                    editTextName.setText(session.getName());
//                    editTextMobile.setText(fetchedUser.getMobile());
                    editTextEmail.setText(fetchedUser.getEmail());
                    String money="Rs. "+fetchedUser.getWalletMoney();
                    editTextWalletMOney.setText(money);
                    //Toast.makeText(getApplicationContext(), object.getString("message"), Toast.LENGTH_SHORT).show();
                    //refreshSingleUser(object.getJSONArray("users"));
                }
            } catch (JSONException e) {
                editTextName = (EditText) findViewById(R.id.editTextName);
                editTextName.setText("error");
                e.printStackTrace();
            }
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
    private void refreshSingleUser(JSONArray singleuser) throws JSONException {
        //heroList.clear();
        User fetchedUser=null;


        for (int i = 0; i < singleuser.length(); i++) {
            JSONObject obj = singleuser.getJSONObject(i);

            /*fetchedUser = new User(
                    obj.getInt("id"),
                    obj.getString("firstname"),
                    obj.getString("lastname"),
                    obj.getString("email"),
                    obj.getString("password"),
                    obj.getString("mobile"),
                    obj.getString("walletmoney"),
                    obj.getString("status")
            );*/
        }

        System.out.println("*********^^^ "+fetchedUser.toString());


        /*HeroAdapter adapter = new HeroAdapter(heroList);
        listView.setAdapter(adapter);*/
        setUserProfile(fetchedUser);
    }
    public void setUserProfile(User user)
    {
        editTextName = (TextView) findViewById(R.id.editTextName);
        editTextMobile = (TextView) findViewById(R.id.editTextMobile);
        editTextEmail = (TextView) findViewById(R.id.editTextEmail);

        /*String name=user.getFirstName()+" "+user.getLastName();
        editTextName.setText(name);
        editTextMobile.setText(user.getMobile());*/
        editTextEmail.setText(user.getEmail());

    }
    /*class HeroAdapter extends ArrayAdapter<Hero> {
        List<Hero> heroList;

        public HeroAdapter(List<Hero> heroList) {
            super(CRUD.this, R.layout.layout_hero_list, heroList);
            this.heroList = heroList;
        }


        @Override
        public View getView(int position, View convertView, ViewGroup parent) {
            LayoutInflater inflater = getLayoutInflater();
            View listViewItem = inflater.inflate(R.layout.layout_hero_list, null, true);

            TextView textViewName = listViewItem.findViewById(R.id.textViewName);

            TextView textViewUpdate = listViewItem.findViewById(R.id.textViewUpdate);
            TextView textViewDelete = listViewItem.findViewById(R.id.textViewDelete);

            final Hero hero = heroList.get(position);

            textViewName.setText(hero.getName());

            textViewUpdate.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {
                    isUpdating = true;
                    editTextHeroId.setText(String.valueOf(hero.getId()));
                    editTextName.setText(hero.getName());
                    editTextRealname.setText(hero.getRealname());
                    ratingBar.setRating(hero.getRating());
                    spinnerTeam.setSelection(((ArrayAdapter<String>) spinnerTeam.getAdapter()).getPosition(hero.getTeamaffiliation()));
                    buttonAddUpdate.setText("Update");
                }
            });

            textViewDelete.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {

                    AlertDialog.Builder builder = new AlertDialog.Builder(CRUD.this);

                    builder.setTitle("Delete " + hero.getName())
                            .setMessage("Are you sure you want to delete it?")
                            .setPositiveButton(android.R.string.yes, new DialogInterface.OnClickListener() {
                                public void onClick(DialogInterface dialog, int which) {
                                    deleteHero(hero.getId());
                                }
                            })
                            .setNegativeButton(android.R.string.no, new DialogInterface.OnClickListener() {
                                public void onClick(DialogInterface dialog, int which) {

                                }
                            })
                            .setIcon(android.R.drawable.ic_dialog_alert)
                            .show();

                }
            });

            return listViewItem;
        }
    }*/
}
